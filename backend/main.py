from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Literal
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import (
    RoundedModuleDrawer,
    CircleModuleDrawer,
    SquareModuleDrawer,
    GappedSquareModuleDrawer,
    HorizontalBarsDrawer,
    VerticalBarsDrawer,
)
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image, ImageDraw
import io
import base64
import math
import segno

app = FastAPI(title="QRForge API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ERROR_LEVELS = {
    "L": qrcode.constants.ERROR_CORRECT_L,
    "M": qrcode.constants.ERROR_CORRECT_M,
    "Q": qrcode.constants.ERROR_CORRECT_Q,
    "H": qrcode.constants.ERROR_CORRECT_H,
}

BODY_DRAWERS = {
    "square": SquareModuleDrawer,
    "rounded": RoundedModuleDrawer,
    "circle": CircleModuleDrawer,
    "gapped": GappedSquareModuleDrawer,
    "horizontal": HorizontalBarsDrawer,
    "vertical": VerticalBarsDrawer,
}


def hex_to_rgb(hex_color: str) -> tuple:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


class QRRequest(BaseModel):
    type: Literal["url", "vcard", "wifi"]
    data: dict
    body_shape: str = "square"
    eye_frame_shape: str = "square"
    eye_ball_shape: str = "square"
    fg_color: str = "#000000"
    bg_color: str = "#FFFFFF"
    eye_color: str = ""
    error_correction: Literal["L", "M", "Q", "H"] = "H"
    logo_base64: Optional[str] = None
    logo_size: float = 0.22
    logo_padding: int = 10
    format: Literal["png", "svg"] = "png"
    size: int = 600


def build_qr_data(req: QRRequest) -> str:
    if req.type == "url":
        return req.data.get("url", "")
    elif req.type == "vcard":
        d = req.data
        lines = [
            "BEGIN:VCARD", "VERSION:3.0",
            f"N:{d.get('last_name','')};{d.get('first_name','')}",
            f"FN:{d.get('first_name','')} {d.get('last_name','')}",
        ]
        if d.get("email"):       lines.append(f"EMAIL:{d['email']}")
        if d.get("phone"):       lines.append(f"TEL:{d['phone']}")
        if d.get("organization"):lines.append(f"ORG:{d['organization']}")
        if d.get("title"):       lines.append(f"TITLE:{d['title']}")
        if d.get("website"):     lines.append(f"URL:{d['website']}")
        if d.get("address"):     lines.append(f"ADR:;;{d['address']};;;;")
        lines.append("END:VCARD")
        return "\n".join(lines)
    elif req.type == "wifi":
        d = req.data
        hidden = "true" if d.get("hidden") else "false"
        return f"WIFI:T:{d.get('security','WPA')};S:{d.get('ssid','')};P:{d.get('password','')};H:{hidden};;"
    return ""


def get_body_drawer(shape: str):
    return BODY_DRAWERS.get(shape, SquareModuleDrawer)()


def draw_eye_frame(draw, box, shape, color, line_width):
    x0, y0, x1, y1 = box
    if shape == "rounded":
        r = (x1 - x0) // 4
        draw.rounded_rectangle([x0,y0,x1,y1], radius=r, outline=color, width=line_width)
    elif shape == "circle":
        draw.ellipse([x0,y0,x1,y1], outline=color, width=line_width)
    elif shape == "sharp_rounded":
        r = (x1 - x0) // 8
        draw.rounded_rectangle([x0,y0,x1,y1], radius=r, outline=color, width=line_width)
    elif shape == "double":
        draw.rectangle([x0,y0,x1,y1], outline=color, width=line_width)
        inset = line_width + 2
        draw.rectangle([x0+inset,y0+inset,x1-inset,y1-inset], outline=color, width=max(1,line_width//2))
    else:  # square
        draw.rectangle([x0,y0,x1,y1], outline=color, width=line_width)


def draw_eye_ball(draw, box, shape, color):
    x0, y0, x1, y1 = box
    cx, cy = (x0+x1)//2, (y0+y1)//2
    if shape == "rounded":
        r = (x1 - x0) // 4
        draw.rounded_rectangle([x0,y0,x1,y1], radius=r, fill=color)
    elif shape == "circle":
        draw.ellipse([x0,y0,x1,y1], fill=color)
    elif shape == "star":
        size = (x1-x0)//2
        points = []
        for i in range(10):
            angle = math.pi * i / 5 - math.pi / 2
            r = size if i % 2 == 0 else size * 0.42
            points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        draw.polygon(points, fill=color)
    elif shape == "diamond":
        draw.polygon([(cx, y0),(x1, cy),(cx, y1),(x0, cy)], fill=color)
    elif shape == "leaf":
        r = (x1-x0)//3
        draw.rounded_rectangle([x0,y0,x1,y1], radius=r, fill=color)
    else:  # square
        draw.rectangle([x0,y0,x1,y1], fill=color)


def apply_custom_eyes(img, req, qr_obj):
    eye_rgb = hex_to_rgb(req.eye_color) if req.eye_color else hex_to_rgb(req.fg_color)
    bg_rgb  = hex_to_rgb(req.bg_color)
    modules = qr_obj.modules_count
    border  = 4
    total_modules = modules + border * 2
    module_px = img.width / total_modules

    eye_positions = [
        (border, border),
        (border + modules - 7, border),
        (border, border + modules - 7),
    ]

    draw = ImageDraw.Draw(img)
    eye_px = 7 * module_px
    lw = max(2, int(module_px * 0.9))

    for (ec, er) in eye_positions:
        px = ec * module_px
        py = er * module_px
        # Wipe area
        draw.rectangle([px, py, px+eye_px, py+eye_px], fill=bg_rgb+(255,))
        # Frame
        frame = (int(px), int(py), int(px+eye_px)-1, int(py+eye_px)-1)
        draw_eye_frame(draw, frame, req.eye_frame_shape, eye_rgb+(255,), lw)
        # Ball (3x3 modules, offset 2 modules from corner)
        bo = 2 * module_px
        bs = 3 * module_px
        ball = (int(px+bo), int(py+bo), int(px+bo+bs)-1, int(py+bo+bs)-1)
        draw_eye_ball(draw, ball, req.eye_ball_shape, eye_rgb+(255,))

    return img


def embed_logo(img, req):
    try:
        logo_data = base64.b64decode(req.logo_base64.split(",")[-1])
        logo = Image.open(io.BytesIO(logo_data)).convert("RGBA")

        logo_max = int(req.size * max(0.08, min(float(req.logo_size), 0.40)))
        logo.thumbnail((logo_max, logo_max), Image.LANCZOS)

        padding = max(4, min(int(req.logo_padding), 50))

        # Sharp-edge white background — NO border-radius
        bg_w = logo.width + padding * 2
        bg_h = logo.height + padding * 2
        logo_bg = Image.new("RGBA", (bg_w, bg_h), (255, 255, 255, 255))
        logo_bg.paste(logo, (padding, padding), logo)

        pos_x = (img.width  - bg_w) // 2
        pos_y = (img.height - bg_h) // 2
        img.paste(logo_bg, (pos_x, pos_y), logo_bg)
    except Exception as e:
        print(f"Logo embed error: {e}")
    return img


def generate_qr_image(req: QRRequest) -> Image.Image:
    data = build_qr_data(req)
    fg_rgb = hex_to_rgb(req.fg_color)
    bg_rgb = hex_to_rgb(req.bg_color)
    error_level = ERROR_LEVELS.get(req.error_correction, qrcode.constants.ERROR_CORRECT_H)

    qr = qrcode.QRCode(version=None, error_correction=error_level, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=get_body_drawer(req.body_shape),
        color_mask=SolidFillColorMask(front_color=fg_rgb, back_color=bg_rgb),
    ).convert("RGBA")

    img = img.resize((req.size, req.size), Image.LANCZOS)

    needs_eyes = (
        req.eye_frame_shape not in ("square", "")
        or req.eye_ball_shape not in ("square", "")
        or (req.eye_color and req.eye_color.strip() != "" and req.eye_color != req.fg_color)
    )
    if needs_eyes:
        img = apply_custom_eyes(img, req, qr)

    if req.logo_base64:
        img = embed_logo(img, req)

    return img


@app.post("/generate")
async def generate_qr(req: QRRequest):
    try:
        img = generate_qr_image(req)
        if req.format == "png":
            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=True)
            buf.seek(0)
            return StreamingResponse(buf, media_type="image/png",
                headers={"Content-Disposition": "attachment; filename=qrforge.png"})
        else:
            data = build_qr_data(req)
            qr_s = segno.make(data, error=req.error_correction.lower())
            svg_buf = io.BytesIO()
            qr_s.save(svg_buf, kind="svg", scale=10, dark=req.fg_color, light=req.bg_color)
            svg_buf.seek(0)
            return StreamingResponse(svg_buf, media_type="image/svg+xml",
                headers={"Content-Disposition": "attachment; filename=qrforge.svg"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preview")
async def preview_qr(req: QRRequest):
    try:
        img = generate_qr_image(req)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        buf.seek(0)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return {"image": f"data:image/png;base64,{b64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}


import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)