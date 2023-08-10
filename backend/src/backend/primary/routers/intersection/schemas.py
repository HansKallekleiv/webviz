from pydantic import BaseModel


class IntersectionPolyLine(BaseModel):
    x_arr: list[float]
    y_arr: list[float]
