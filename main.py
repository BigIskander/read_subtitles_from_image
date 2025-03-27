from typing import Union

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# @app.get("/")
# def read_root():
#     return {"Hello": "World"}


# @app.get("/items/{item_id}")
# def read_item(item_id: int, q: Union[str, None] = None):
#     return {"item_id": item_id, "q": q}

@app.get("/langs")
def read_item():
    return { 
        "langs": ["chi_all", "eng"],
        "langsPaddle": ["ch", "en", "chinese_cht"] 
    }

@app.post("/recognize")
def read_item():
    return {}

# serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")