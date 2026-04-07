def test_create_order(client):
    response = client.post("/api/v1/orders/", json={
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "01/15/1990",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["date_of_birth"] == "01/15/1990"
    assert data["status"] == "pending"
    assert data["extracted_from_document"] is False


def test_create_order_missing_fields(client):
    response = client.post("/api/v1/orders/", json={"first_name": "John"})
    assert response.status_code == 422


def test_create_order_empty_name(client):
    response = client.post("/api/v1/orders/", json={
        "first_name": "  ",
        "last_name": "Doe",
        "date_of_birth": "01/15/1990",
    })
    assert response.status_code == 422


def test_list_orders(client):
    client.post("/api/v1/orders/", json={
        "first_name": "A", "last_name": "B", "date_of_birth": "01/01/2000"
    })
    client.post("/api/v1/orders/", json={
        "first_name": "C", "last_name": "D", "date_of_birth": "02/02/2000"
    })
    response = client.get("/api/v1/orders/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_get_order(client):
    create = client.post("/api/v1/orders/", json={
        "first_name": "Jane", "last_name": "Smith", "date_of_birth": "03/03/1985"
    })
    order_id = create.json()["id"]
    response = client.get(f"/api/v1/orders/{order_id}")
    assert response.status_code == 200
    assert response.json()["first_name"] == "Jane"


def test_get_order_not_found(client):
    response = client.get("/api/v1/orders/99999")
    assert response.status_code == 404


def test_update_order(client):
    create = client.post("/api/v1/orders/", json={
        "first_name": "Bob", "last_name": "Jones", "date_of_birth": "04/04/1970"
    })
    order_id = create.json()["id"]
    response = client.put(f"/api/v1/orders/{order_id}", json={"status": "complete"})
    assert response.status_code == 200
    assert response.json()["status"] == "complete"


def test_delete_order(client):
    create = client.post("/api/v1/orders/", json={
        "first_name": "Delete", "last_name": "Me", "date_of_birth": "05/05/1980"
    })
    order_id = create.json()["id"]
    response = client.delete(f"/api/v1/orders/{order_id}")
    assert response.status_code == 204
    get_response = client.get(f"/api/v1/orders/{order_id}")
    assert get_response.status_code == 404


def test_delete_order_not_found(client):
    response = client.delete("/api/v1/orders/99999")
    assert response.status_code == 404


def test_upload_non_pdf(client):
    response = client.post(
        "/api/v1/orders/upload",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400


def test_upload_pdf_with_mock(client):
    """Test PDF upload with mocked extractor."""
    from unittest.mock import patch, AsyncMock

    mock_result = {
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "01/15/1990",
        "confidence": 0.95,
    }

    # Create a minimal valid PDF
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Patient: John Doe DOB: 01/15/1990")
    pdf_bytes = doc.tobytes()
    doc.close()

    with patch("app.services.pdf_extractor.PDFExtractor") as MockExtractor:
        MockExtractor.return_value.extract = AsyncMock(return_value=mock_result)
        response = client.post(
            "/api/v1/orders/upload",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["order"]["first_name"] == "John"
    assert data["order"]["last_name"] == "Doe"
    assert data["order"]["extracted_from_document"] is True
    assert data["order"]["status"] == "complete"
    assert data["extracted_data"]["confidence"] == 0.95
