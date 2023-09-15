const request = require("supertest");
const users = ("./routes/api/users") // Tutaj podaj ścieżkę do pliku głównego aplikacji Express
const mongoose = require("mongoose");
const User = require("./service/schema/users");

// Przygotowanie przed testami
beforeAll(async () => {
  // Połącz się z bazą danych testową lub użyj innych mechanizmów do tworzenia baz testowych
  // np. biblioteka mongoose-memory-server
});

afterAll(async () => {
  // Zamknij połączenie z bazą danych po zakończeniu testów
  await mongoose.connection.close();
});

describe("POST /api/users/login", () => {
  it("powinien zalogować użytkownika i zwrócić token oraz dane użytkownika", async () => {
    // Przygotowanie testowych danych użytkownika
    const userData = {
      email: "test@example.com",
      password: "testpassword",
      subscription: "starter",
    };

    // Utworzenie testowego użytkownika w bazie danych
    const user = await User.create(userData);

    // Wykonanie żądania POST do ścieżki /api/users/login
    const response = await request(users)
      .post("/api/users/login")
      .send({
        email: userData.email,
        password: userData.password,
      });

    // Sprawdzenie statusu odpowiedzi
    expect(response.status).toBe(200);

    // Sprawdzenie, czy odpowiedź zawiera token
    expect(response.body).toHaveProperty("token");

    // Sprawdzenie, czy odpowiedź zawiera obiekt użytkownika z polami email i subscription
    expect(response.body.user).toHaveProperty("email");
    expect(response.body.user).toHaveProperty("subscription");
    expect(typeof response.body.user.email).toBe("string");
    expect(typeof response.body.user.subscription).toBe("string");
  });

  it("powinien zwrócić błąd 400 przy brakujących danych logowania", async () => {
    const response = await request(users)
      .post("/api/users/login")
      .send({});

    expect(response.status).toBe(400);
  });

  it("powinien zwrócić błąd 400 przy błędnych danych logowania", async () => {
    const response = await request(users)
      .post("/api/users/login")
      .send({
        email: "nieistniejacy@example.com",
        password: "niepoprawnehaslo",
      });

    expect(response.status).toBe(400);
  });
});
