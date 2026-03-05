import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r"c:\Users\f.alandete\OneDrive - Universidad de los andes\Documentos\02. Personal\01. Proyectos\01. SEMAD\Formatos\Historia Clinica - SEMAD.docx"

try:
    with zipfile.ZipFile(docx_path, 'r') as z:
        xml_content = z.read('word/document.xml')
    
    tree = ET.fromstring(xml_content)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    text = []
    for p in tree.iterfind('.//w:p', ns):
        p_text = ""
        for t in p.iterfind('.//w:t', ns):
            if t.text:
                p_text += t.text
        if p_text:
            text.append(p_text)
            
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract_docx.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(text))
    print(f"Success! Saved to {out_path}")
except Exception as e:
    print(f"Error: {e}")
