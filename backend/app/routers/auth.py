from fastapi import APIRouter, HTTPException, status

from ..schemas import CredenciaisLogin, RespostaToken
from ..security import authenticate, create_access_token

router = APIRouter(prefix="/autenticacao", tags=["autenticacao"])


@router.post("/login", response_model=RespostaToken)
def login(body: CredenciaisLogin) -> RespostaToken:
    if not authenticate(body.usuario, body.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )
    return RespostaToken(token_acesso=create_access_token(body.usuario))
