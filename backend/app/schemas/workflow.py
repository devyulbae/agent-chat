from pydantic import BaseModel, Field


class WorkflowPattern(BaseModel):
    id: str
    name: str
    description: str
    best_for: list[str]


class CanvasNode(BaseModel):
    id: str
    pattern_id: str
    title: str
    x: int = Field(default=100, ge=0)
    y: int = Field(default=100, ge=0)
    prompt: str = ""
    capabilities: list[str] = []


class CanvasEdge(BaseModel):
    from_node_id: str
    to_node_id: str
    label: str = ""


class OrchestrationCanvas(BaseModel):
    id: str
    name: str
    nodes: list[CanvasNode] = []
    edges: list[CanvasEdge] = []
