import os, sys, re, base64
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from paddleocr import PaddleOCR

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

@app.post("/recognize")
def create_item(requestData: rcognizeRequest):
    img_bytes = base64.b64decode(requestData.base64image.split("base64,")[1])
    lang = requestData.lang
    if not requestData.usePaddleOcr:
        return { "err": "", "data": "not implemented yet"}
    else:
        # recognize text PaddleOCR
        det = requestData.multiline
        output = ""
        try:
            ocr = PaddleOCR(use_angle_cls=True, lang=lang)
            result = ocr.ocr(img_bytes, det=det, cls=True)
            for idx in range(len(result)):
                res = result[idx]
                if res:
                    if det:
                        for line in res:
                            output = output + line[1][0] + "\n"
                    else:
                        for line in res:
                            output = output + line[0] + "\n"
            if output != "":
                output = output[:-1]
            return { "err": "", "data": str(output) }
        except Exception as e:
            return { "err": str(e), "data": "" }

# serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")