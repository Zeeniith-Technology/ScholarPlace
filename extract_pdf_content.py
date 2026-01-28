import sys
import os

try:
    import PyPDF2
    has_pypdf2 = True
except ImportError:
    has_pypdf2 = False

try:
    import pdfplumber
    has_pdfplumber = True
except ImportError:
    has_pdfplumber = False

def extract_text_pypdf2(pdf_path):
    """Extract text using PyPDF2"""
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_pdfplumber(pdf_path):
    """Extract text using pdfplumber"""
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def extract_pdf(pdf_path):
    """Extract text from PDF using available library"""
    if has_pdfplumber:
        return extract_text_pdfplumber(pdf_path)
    elif has_pypdf2:
        return extract_text_pypdf2(pdf_path)
    else:
        return None

if __name__ == "__main__":
    notes_dir = os.path.join(os.getcwd(), "Notes")
    pdfs = ["C_Langauge.pdf", "C++_notes.pdf", "JavaScript.pdf"]
    
    # Check if libraries are available
    if not has_pypdf2 and not has_pdfplumber:
        print("[INFO] No PDF library found. Installing PyPDF2...")
        os.system("pip install PyPDF2 -q")
        try:
            import PyPDF2
            has_pypdf2 = True
            print("[OK] PyPDF2 installed successfully")
        except ImportError:
            print("[ERROR] Could not install PyPDF2. Please install manually: pip install PyPDF2")
            sys.exit(1)
    
    for pdf_name in pdfs:
        pdf_path = os.path.join(notes_dir, pdf_name)
        if os.path.exists(pdf_path):
            print(f"\n{'='*80}")
            print(f"EXTRACTING: {pdf_name}")
            print(f"{'='*80}\n")
            try:
                text = extract_pdf(pdf_path)
                if text:
                    # Save to text file
                    output_file = os.path.join(notes_dir, pdf_name.replace('.pdf', '_extracted.txt'))
                    try:
                        with open(output_file, 'w', encoding='utf-8', errors='replace') as f:
                            f.write(text)
                    except Exception as e:
                        # Try with different encoding
                        with open(output_file, 'w', encoding='utf-8', errors='ignore') as f:
                            f.write(text)
                    print(f"[OK] Extracted {len(text)} characters from {pdf_name}")
                    print(f"[OK] Saved to: {output_file}")
                    # Print first 500 characters as preview
                    print(f"\nPreview (first 500 chars):\n{text[:500]}...")
                else:
                    print(f"[ERROR] Could not extract text from {pdf_name}")
            except Exception as e:
                print(f"[ERROR] Error extracting {pdf_name}: {str(e)}")
        else:
            print(f"[ERROR] File not found: {pdf_path}")



try:
    import PyPDF2
    has_pypdf2 = True
except ImportError:
    has_pypdf2 = False

try:
    import pdfplumber
    has_pdfplumber = True
except ImportError:
    has_pdfplumber = False

def extract_text_pypdf2(pdf_path):
    """Extract text using PyPDF2"""
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_pdfplumber(pdf_path):
    """Extract text using pdfplumber"""
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def extract_pdf(pdf_path):
    """Extract text from PDF using available library"""
    if has_pdfplumber:
        return extract_text_pdfplumber(pdf_path)
    elif has_pypdf2:
        return extract_text_pypdf2(pdf_path)
    else:
        return None

if __name__ == "__main__":
    notes_dir = os.path.join(os.getcwd(), "Notes")
    pdfs = ["C_Langauge.pdf", "C++_notes.pdf", "JavaScript.pdf"]
    
    # Check if libraries are available
    if not has_pypdf2 and not has_pdfplumber:
        print("[INFO] No PDF library found. Installing PyPDF2...")
        os.system("pip install PyPDF2 -q")
        try:
            import PyPDF2
            has_pypdf2 = True
            print("[OK] PyPDF2 installed successfully")
        except ImportError:
            print("[ERROR] Could not install PyPDF2. Please install manually: pip install PyPDF2")
            sys.exit(1)
    
    for pdf_name in pdfs:
        pdf_path = os.path.join(notes_dir, pdf_name)
        if os.path.exists(pdf_path):
            print(f"\n{'='*80}")
            print(f"EXTRACTING: {pdf_name}")
            print(f"{'='*80}\n")
            try:
                text = extract_pdf(pdf_path)
                if text:
                    # Save to text file
                    output_file = os.path.join(notes_dir, pdf_name.replace('.pdf', '_extracted.txt'))
                    try:
                        with open(output_file, 'w', encoding='utf-8', errors='replace') as f:
                            f.write(text)
                    except Exception as e:
                        # Try with different encoding
                        with open(output_file, 'w', encoding='utf-8', errors='ignore') as f:
                            f.write(text)
                    print(f"[OK] Extracted {len(text)} characters from {pdf_name}")
                    print(f"[OK] Saved to: {output_file}")
                    # Print first 500 characters as preview
                    print(f"\nPreview (first 500 chars):\n{text[:500]}...")
                else:
                    print(f"[ERROR] Could not extract text from {pdf_name}")
            except Exception as e:
                print(f"[ERROR] Error extracting {pdf_name}: {str(e)}")
        else:
            print(f"[ERROR] File not found: {pdf_path}")

