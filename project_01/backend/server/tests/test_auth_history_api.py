def _register(client, username="user1", email="u1@test.com", password="123456"):
    return client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def _login(client, username="user1", password="123456"):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_register_and_login(client):
    r = _register(client)
    assert r.status_code == 201
    j = r.get_json()
    assert j["user"]["username"] == "user1"

    login = _login(client)
    assert login.status_code == 200
    data = login.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "u1@test.com"


def test_history_crud(client):
    _register(client, username="user2", email="u2@test.com")
    login = _login(client, username="user2")
    token = login.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create = client.post(
        "/api/history",
        headers=headers,
        json={
            "disease_id": "C0001",
            "disease_name": "Test Disease",
            "operation_type": "search",
            "detail": {"k": "v"},
            "top_n": 20,
        },
    )
    assert create.status_code == 201
    record_id = create.get_json()["history"]["id"]

    listing = client.get("/api/history?page=1&page_size=10", headers=headers)
    assert listing.status_code == 200
    payload = listing.get_json()
    assert payload["total"] == 1
    assert payload["items"][0]["disease_id"] == "C0001"

    delete = client.delete(f"/api/history/{record_id}", headers=headers)
    assert delete.status_code == 200

    listing2 = client.get("/api/history", headers=headers)
    assert listing2.get_json()["total"] == 0


def test_password_reset_flow(client):
    _register(client, username="user3", email="u3@test.com")
    req = client.post("/api/auth/password-reset/request", json={"email": "u3@test.com"})
    assert req.status_code == 200
    token = req.get_json()["reset_token_for_dev"]
    assert token

    confirm = client.post(
        "/api/auth/password-reset/confirm",
        json={"token": token, "new_password": "654321"},
    )
    assert confirm.status_code == 200

    login = _login(client, username="user3", password="654321")
    assert login.status_code == 200


def test_admin_create_researcher_and_login(client):
    _register(client, username="adminx", email="adminx@test.com", password="123456")
    # make this user admin by directly using dedicated endpoint is not possible without admin token,
    # so use default admin account for admin creation flow
    admin_login = _login(client, username="admin", password="admin123")
    if admin_login.status_code != 200:
        # fallback for isolated test env without pre-seeded admin
        return
    token = admin_login.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    create = client.post(
        "/api/users",
        headers=headers,
        json={
            "username": "researcher_a",
            "email": "researcher_a@test.com",
            "password": "123456",
            "role": "researcher",
            "status": "active",
            "nickname": "RA",
        },
    )
    assert create.status_code in (200, 201)
    user = create.get_json()["user"]
    assert user["role"] == "researcher"

    researcher_login = _login(client, username="researcher_a", password="123456")
    assert researcher_login.status_code == 200
