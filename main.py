from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:8080",
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
        "langs": ["chi_all", "eng"],
        "langsPaddle": ["ch", "en", "chinese_cht"] 
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
        return { "err": "", "data": requestData.base64image }

# serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")