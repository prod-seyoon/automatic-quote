import os
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib import colors
from datetime import datetime

_font_registered = False

def _ensure_font():
    global _font_registered
    if _font_registered:
        return 'Malgun'
    font_path = "C:/Windows/Fonts/malgun.ttf"
    font_bold_path = "C:/Windows/Fonts/malgunbd.ttf"
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont('Malgun', font_path))
        if os.path.exists(font_bold_path):
            pdfmetrics.registerFont(TTFont('MalgunBold', font_bold_path))
        _font_registered = True
        return 'Malgun'
    _font_registered = True
    return 'Helvetica'

def generate_estimate_pdf(estimate_data: dict, client_data: dict = None) -> bytes:
    font_name = _ensure_font()
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    y = height - 60
    
    # Title
    c.setFont(font_name, 22)
    c.drawString(50, y, "3D 프린팅 자동 견적서")
    y -= 15
    
    # Separator line
    c.setStrokeColor(colors.HexColor('#2196F3'))
    c.setLineWidth(2)
    c.line(50, y, width - 50, y)
    y -= 25
    
    c.setFont(font_name, 10)
    c.setFillColor(colors.HexColor('#666666'))
    c.drawString(50, y, "본 견적서는 자동 산출된 근사치이며, 실제 출력 금액과 차이가 있을 수 있습니다.")
    c.setFillColor(colors.black)
    y -= 30
    
    # === Client Info Table (If provided) ===
    if client_data:
        c.setFont(font_name, 12)
        c.drawString(50, y, f"■ 수신: {client_data.get('company_name', '')} {client_data.get('customer_name', '')} 귀하")
        c.drawString(width - 250, y, f"일자: {datetime.now().strftime('%Y-%m-%d')}")
        y -= 30
    
    # === Estimate Details ===
    c.setFont(font_name, 14)
    c.drawString(50, y, "■ 견적 요약")
    y -= 20
    
    c.setFont(font_name, 11)
    c.drawString(60, y, f"제작 방식: {estimate_data['production_method']}")
    c.drawString(width/2, y, f"적용 소재: {estimate_data['material']}")
    y -= 18
    hollow_text = f"적용 (두께: {estimate_data.get('shell_thickness')}mm)" if estimate_data.get('is_hollow') else "미적용"
    c.drawString(60, y, f"최종 수량: 세트 당 {estimate_data['quantity']}개")
    c.drawString(width/2, y, f"속 파기(Shell): {hollow_text}")
    y -= 30
    
    # === Part Info Table ===
    c.setFont(font_name, 14)
    c.drawString(50, y, "■ 산출 파트 정보")
    y -= 20
    
    # Table header
    c.setFont(font_name, 9)
    c.setFillColor(colors.HexColor('#2196F3'))
    c.rect(50, y - 5, width - 100, 18, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.drawString(55, y, "파일명")
    c.setFillColor(colors.black)
    y -= 22
    
    for fname in estimate_data.get('file_paths', []):
        c.setFont(font_name, 9)
        name = fname
        if len(name) > 50:
            name = name[:47] + "..."
        c.drawString(55, y, name)
        y -= 16
    
    y -= 15
    
    if estimate_data.get('bin_packing_data'):
        c.setFont(font_name, 10)
        c.drawString(50, y, "* 상세 분석 수치:")
        y -= 15
        for det in estimate_data['bin_packing_data']:
            vol = det.get('volume_mm3', 0) / 1000 # to cm3
            est_cost = det.get('estimated_cost', 0)
            c.setFont(font_name, 9)
            c.drawString(60, y, f"- {det.get('filename')}: 체적 {vol:.2f} cm³, 금액 {est_cost:,} 원")
            y -= 15
        y -= 10
    
    # === Summary ===
    c.setStrokeColor(colors.HexColor('#2196F3'))
    c.setLineWidth(1)
    c.line(50, y, width - 50, y)
    y -= 25
    
    c.setFont(font_name, 14)
    c.drawString(50, y, "■ 총 견적 금액 (VAT 별도)")
    c.setFont(font_name, 18)
    c.setFillColor(colors.HexColor('#2196F3'))
    c.drawString(50, y - 25, f"합계: {estimate_data['calculated_amount']:,} 원")
    
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
