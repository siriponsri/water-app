"""
Word to PDF Converter Script
ใช้สำหรับ subprocess call จาก Flask server
เพื่อหลีกเลี่ยงปัญหา COM threading
"""
import sys
import os

def convert_with_pywin32(word_path, pdf_path):
    """Convert using pywin32"""
    try:
        import win32com.client
        import pythoncom
        
        pythoncom.CoInitialize()
        word = None
        doc = None
        
        try:
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            word.DisplayAlerts = False
            
            doc = word.Documents.Open(word_path)
            doc.SaveAs2(pdf_path, FileFormat=17)
            
            return True, None
        finally:
            if doc:
                doc.Close(SaveChanges=False)
            if word:
                word.Quit()
            pythoncom.CoUninitialize()
            
    except Exception as e:
        return False, str(e)

def convert_with_comtypes(word_path, pdf_path):
    """Convert using comtypes as fallback"""
    try:
        import comtypes.client
        
        word = comtypes.client.CreateObject('Word.Application')
        word.Visible = False
        
        doc = word.Documents.Open(word_path)
        doc.SaveAs(pdf_path, FileFormat=17)
        doc.Close()
        word.Quit()
        
        return True, None
    except Exception as e:
        return False, str(e)

def main():
    if len(sys.argv) != 3:
        print("ERROR: Usage: convert_word_to_pdf.py <word_path> <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    word_path = os.path.abspath(sys.argv[1])
    pdf_path = os.path.abspath(sys.argv[2])
    
    print(f"[CONVERT] Word: {word_path}")
    print(f"[CONVERT] PDF:  {pdf_path}")
    
    # Check if Word file exists
    if not os.path.exists(word_path):
        print(f"ERROR: Word file not found: {word_path}", file=sys.stderr)
        sys.exit(1)
    
    # Try pywin32 first
    print("[CONVERT] Trying pywin32...")
    success, error = convert_with_pywin32(word_path, pdf_path)
    if success:
        print("[CONVERT] OK - pywin32")
        sys.exit(0)
    else:
        print(f"[CONVERT] pywin32 failed: {error}")
    
    # Try comtypes
    print("[CONVERT] Trying comtypes...")
    success, error = convert_with_comtypes(word_path, pdf_path)
    if success:
        print("[CONVERT] OK - comtypes")
        sys.exit(0)
    else:
        print(f"[CONVERT] comtypes failed: {error}")
    
    print("ERROR: All conversion methods failed", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    main()
