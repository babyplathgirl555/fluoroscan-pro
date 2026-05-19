from fastapi import FastAPI

# Esta es la variable "app" que Uvicorn está buscando
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "¡Servidor recuperado!"}

@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id, "status": "Todo ok"}