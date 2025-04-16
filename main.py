import os, sys, re, base64, uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from subprocess import Popen, PIPE
from paddleocr import PaddleOCR
# to sort the results
from functools import cmp_to_key

# get env variables
envTesslangs = [
    lang for lang in 
        re.sub(r'(?:\s)', "", 
            os.environ.get("TESSLANGS", "chi_all;eng;")
        ).split(";") 
        if lang != ""
]
envPaddlelangs = [
    lang for lang in 
        re.sub(r'(?:\s)', "", 
            os.environ.get("PADDLELANGS", "ch;en;chinese_cht;")
        ).split(";") 
        if lang != ""
]

app = FastAPI()

if len(sys.argv) >=2:
    if sys.argv[1] == "dev":
        origins = [
            "http://localhost:5173",
        ]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

@app.get("/langs")
def read_item():
    return { 
        "langs": envTesslangs,
        "langsPaddle": envPaddlelangs 
    }

class rcognizeRequest(BaseModel):
    usePaddleOcr: bool
    base64image: str
    lang: str
    psmValue: int 
    multiline: bool

# is positions or text results one line or not
def is_paddleocr_result_positions_inline(bbox1, bbox2):
    return not (bbox1[0][1][1] > bbox2[0][3][1] or bbox1[0][3][1] < bbox2[0][1][1])

# compare paddle ocr results to sort them
def compare_paddleocr_result_positions(bbox1, bbox2):
    if is_paddleocr_result_positions_inline(bbox1, bbox2):
        return bbox1[0][0][0] - bbox2[0][0][0]
    else:
        return bbox1[0][0][1] - bbox2[0][0][1]

@app.post("/recognize")
def create_item(requestData: rcognizeRequest):
    img_bytes = base64.b64decode(requestData.base64image.split("base64,")[1])
    if not requestData.usePaddleOcr:
        # recognize text Tesseract OCR
        # check data
        if requestData.lang in envTesslangs:
            lang = requestData.lang
        else:
            lang = "chi_all"
        if requestData.psmValue >=0 and requestData.psmValue <=13:
            psm = requestData.psmValue
        else:
            psm = int(3)
        # run Tesseract OCR and return results
        try:
            tesseract = Popen([
                "tesseract", 
                "-l", lang, 
                "--dpi", "96", 
                "--psm", str(psm), 
                "--oem", "3", 
                "-", "stdout"
            ], stdout=PIPE, stdin=PIPE, stderr=PIPE, text=False)
            stdout_data = tesseract.communicate(input=img_bytes)
            if stdout_data[1].decode() != "":
                return { "err": stdout_data[1].decode(), "data": "" }
            else:
                return { "err": "", "data": stdout_data[0].decode() }
        except Exception as e:
            return { "err": str(e), "data": "" }
    else:
        # recognize text PaddleOCR
        # check data
        if requestData.lang in envPaddlelangs:
            lang = requestData.lang
        else:
            lang = "ch"
        det = requestData.multiline
        # run PaddleOCR and return results
        output = ""
        try:
            ocr = PaddleOCR(use_angle_cls=True, lang=lang)
            result = ocr.ocr(img_bytes, det=det, cls=True)
            for idx in range(len(result)):
                res = result[idx]
                if res:
                    if det:
                        res = sorted(res, key=cmp_to_key(compare_paddleocr_result_positions))
                        res = sorted(res, key=cmp_to_key(compare_paddleocr_result_positions))
                        prev = None
                        for line in res:
                            if prev != None:
                                if is_paddleocr_result_positions_inline(line, prev):
                                    output = output + "\t" + line[1][0]
                                else:
                                    output = output + "\n" + line[1][0]
                            else:
                                output = line[1][0]
                            prev = line
                        output = output + "\n"
                    else:
                        for line in res:
                            output = output + line[0] + "\n"
            return { "err": "", "data": str(output) }
        except Exception as e:
            return { "err": str(e), "data": "" }

try:
    # serve static files
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")
except Exception as e:  
    if len(sys.argv) >=2:
        if sys.argv[1] == "dev":
            print("failed to mount static files")
        else:
            # failed to mount static files
            raise Exception("failed to mount static files")
    else:
        # failed to mount static files
        raise Exception("failed to mount static files")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)