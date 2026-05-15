require("dotenv").config();
const express = require("express");
const app = express();

const alumnosRoutes = require("./src/routes/alumnos");
const profesoresRoutes = require("./src/routes/profesores");

const { sequelize } = require("./src/config/aws");
const { Alumno } = require("./src/controllers/alumnos");
const { Profesor } = require("./src/controllers/profesores");

app.use(express.json());

app.use("/alumnos", alumnosRoutes);
app.use("/profesores", profesoresRoutes);

const PORT = process.env.PORT || 8080;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("=========================================");
    console.log("🚀 Base de datos sincronizada con AWS RDS");
    console.log("=========================================");

    app.listen(PORT, () => {
      console.log(`Servidor API SICEI corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al sincronizar la base de datos:", err);
  });
