import os
import json
import tempfile
import google.generativeai as genai
from typing import Dict, Any

def extract_business_registration(file_path: str) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY is not set.")
        return {}
        
    try:
        genai.configure(api_key=api_key)
        
        # Use Gemini 1.5 Flash which is fast, cost-effective, and excellent at vision tasks
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Upload the file to Gemini via File API (required for vision/PDF tasks)
        sample_file = genai.upload_file(path=file_path, display_name="business_registration")
        
        prompt = """
        이 이미지는 대한민국의 사업자등록증입니다. 다음 정보를 추출하여 정확하게 JSON 형식으로 반환해 주세요.
        추출할 필드:
        1. business_registration_number: 등록번호 (예: 123-45-67890)
        2. company_name: 상호명(법인명)
        3. representative_name: 성명(대표자)
        4. address: 사업장 소재지
        5. business_type: 업태
        6. business_item: 종목 (여러 개일 경우 쉼표로 구분)
        
        응답은 오직 JSON 형식으로만 작성해 주세요. markdown 코드 블록(```json ... ```)을 사용하지 마세요.
        """
        
        response = model.generate_content([sample_file, prompt])
        
        # Cleanup file from Gemini servers immediately
        genai.delete_file(sample_file.name)
        
        data = response.text.strip()
        
        # Clean up Markdown boundaries if Gemini returned them despite instructions
        if data.startswith("```json"):
            data = data[7:-3].strip()
        elif data.startswith("```"):
            data = data[3:-3].strip()
            
        parsed = json.loads(data)
        return parsed
        
    except Exception as e:
        print(f"OCR Parsing Error: {e}")
        return {"error": str(e)}
