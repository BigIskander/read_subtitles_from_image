import os, sys, re
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    if not requestData.usePaddleOcr:
        return { "err": "", "data": "not implemented yet"}
    else:
        return { "err": "", "data": str(envTesslangs) }

# serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")