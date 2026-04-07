def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "genhealth-assessment"
    assert data["version"] == "1.0.0"


def test_root_serves_frontend(client):
    response = client.get("/")
    assert response.status_code == 200
