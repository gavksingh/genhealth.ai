def test_list_logs_empty(client):
    response = client.get("/api/v1/logs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_logs_auto_created(client):
    """Making API calls should create log entries automatically."""
    # Make a request that should be logged
    client.get("/api/v1/orders/")

    # Check logs — should have at least the orders request + possibly the logs request
    response = client.get("/api/v1/logs/")
    assert response.status_code == 200
    logs = response.json()
    paths = [log["path"] for log in logs]
    assert "/api/v1/orders/" in paths


def test_logs_skip_health(client):
    """Health endpoint should not be logged."""
    client.get("/health")
    response = client.get("/api/v1/logs/")
    logs = response.json()
    health_logs = [log for log in logs if log["path"] == "/health"]
    assert len(health_logs) == 0
