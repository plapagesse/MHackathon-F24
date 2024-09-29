import json

import requests
from hypothesis import given
from hypothesis import strategies as st

BASE_URL = "http://localhost:8000"  # Change if needed


@given(topic=st.text(min_size=1, max_size=100))  # Fuzzing for `topic` input
def test_create_lobby(topic):
    response = requests.post(f"{BASE_URL}/create-lobby", json={"topic": topic})
    assert response.status_code == 200


@given(lobby_id=st.text(min_size=1, max_size=50))
def test_get_lobby_invalid_id(lobby_id):
    response = requests.get(f"{BASE_URL}/lobby/{lobby_id}")
    assert response.status_code in [400, 404]  # Invalid ID should return 400 or 404
