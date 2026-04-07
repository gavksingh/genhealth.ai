def test_list_logs_empty(client):
    response = client.get("/api/v1/logs/")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert isinstance(data["logs"], list)
    assert data["total"] >= 0
    assert data["skip"] == 0
    assert data["limit"] == 10


def test_logs_auto_created(client):
    """Making API calls should create log entries automatically."""
    # Make a request that should be logged
    client.get("/api/v1/orders/")

    # Check logs — should have at least the orders request
    response = client.get("/api/v1/logs/")
    assert response.status_code == 200
    data = response.json()
    paths = [log["path"] for log in data["logs"]]
    assert "/api/v1/orders/" in paths


def test_logs_skip_health(client):
    """Health endpoint should not be logged."""
    client.get("/health")
    response = client.get("/api/v1/logs/")
    data = response.json()
    health_logs = [log for log in data["logs"] if log["path"] == "/health"]
    assert len(health_logs) == 0


def test_logs_pagination(client):
    """Test pagination parameters work correctly."""
    # Generate some logs
    for _ in range(5):
        client.get("/api/v1/orders/")

    response = client.get("/api/v1/logs/?skip=0&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) <= 2
    assert data["limit"] == 2
    assert data["total"] >= 5
