import os
import json
import PyPDF2
from io import BytesIO
import google.generativeai as genai
from typing import Dict, Any

# Configure Gemini AI
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def extract_text_from_pdf(pdf_content: bytes) -> str:
    """Extract text from PDF content"""
    try:
        pdf_file = BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

async def analyze_resume_with_gemini(pdf_content: bytes, job_description: str) -> Dict[str, Any]:
    """Analyze resume against job description using Gemini AI"""
    
    # Extract text from PDF
    resume_text = await extract_text_from_pdf(pdf_content)
    
    if not resume_text:
        raise Exception("Could not extract text from PDF")
    
    # Create Gemini model
    model = genai.GenerativeModel('gemini-3-flash-preview')
    
    # Comprehensive analysis prompt
    prompt = f"""
    You are an expert HR professional and resume analyst. Analyze the following resume against the job description and provide a comprehensive analysis.

    RESUME:
    {resume_text}

    JOB DESCRIPTION:
    {job_description}

    Please provide a detailed analysis in the following JSON format:

    {{
        "overall_score": <number between 0-100>,
        "analysis_summary": "<brief 2-3 sentence summary>",
        "matched_skills": [
            {{"skill": "<skill name>", "confidence": <0-100>, "evidence": "<where found in resume>"}}
        ],
        "missing_skills": [
            {{"skill": "<skill name>", "importance": "<high/medium/low>", "category": "<technical/soft/domain>"}}
        ],
        "strengths": [
            {{"strength": "<strength description>", "impact": "<high/medium/low>"}}
        ],
        "weaknesses": [
            {{"weakness": "<weakness description>", "severity": "<high/medium/low>"}}
        ],
        "recommendations": [
            {{"recommendation": "<specific actionable advice>", "priority": "<high/medium/low>", "timeframe": "<short/medium/long term>"}}
        ],
        "experience_analysis": {{
            "years_of_experience": <number>,
            "relevant_experience": "<percentage match>",
            "career_progression": "<assessment>",
            "industry_fit": "<assessment>"
        }},
        "education_analysis": {{
            "degree_relevance": "<high/medium/low>",
            "certifications": ["<list of relevant certifications>"],
            "missing_certifications": ["<list of recommended certifications>"]
        }},
        "ats_score": {{
            "keyword_match": <0-100>,
            "format_score": <0-100>,
            "readability": <0-100>
        }},
        "salary_insights": {{
            "estimated_fit": "<underqualified/qualified/overqualified>",
            "market_position": "<below/at/above market rate>"
        }}
    }}

    Ensure all scores are realistic and based on actual content analysis. Be specific and actionable in recommendations.
    """
    
    try:
        # Generate analysis
        response = model.generate_content(prompt)
        
        # Parse JSON response
        analysis_text = response.text
        
        # Clean up the response to extract JSON
        start_idx = analysis_text.find('{')
        end_idx = analysis_text.rfind('}') + 1
        
        if start_idx == -1 or end_idx == 0:
            raise Exception("Invalid response format from AI")
        
        json_str = analysis_text[start_idx:end_idx]
        analysis = json.loads(json_str)
        
        # Validate and ensure all required fields exist
        analysis = validate_analysis_response(analysis)
        
        return analysis
        
    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise Exception(f"AI analysis failed: {str(e)}")

def validate_analysis_response(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and fill missing fields in analysis response"""
    
    # Ensure required fields exist with defaults
    defaults = {
        "overall_score": 50,
        "analysis_summary": "Analysis completed",
        "matched_skills": [],
        "missing_skills": [],
        "strengths": [],
        "weaknesses": [],
        "recommendations": [],
        "experience_analysis": {
            "years_of_experience": 0,
            "relevant_experience": "Unknown",
            "career_progression": "Cannot assess",
            "industry_fit": "Unknown"
        },
        "education_analysis": {
            "degree_relevance": "medium",
            "certifications": [],
            "missing_certifications": []
        },
        "ats_score": {
            "keyword_match": 50,
            "format_score": 70,
            "readability": 80
        },
        "salary_insights": {
            "estimated_fit": "qualified",
            "market_position": "at market rate"
        }
    }
    
    # Fill missing fields
    for key, default_value in defaults.items():
        if key not in analysis:
            analysis[key] = default_value
        elif isinstance(default_value, dict):
            for sub_key, sub_default in default_value.items():
                if sub_key not in analysis[key]:
                    analysis[key][sub_key] = sub_default
    
    # Ensure scores are within valid range
    analysis["overall_score"] = max(0, min(100, analysis["overall_score"]))
    
    if "ats_score" in analysis:
        for score_key in ["keyword_match", "format_score", "readability"]:
            if score_key in analysis["ats_score"]:
                analysis["ats_score"][score_key] = max(0, min(100, analysis["ats_score"][score_key]))
    
    return analysis