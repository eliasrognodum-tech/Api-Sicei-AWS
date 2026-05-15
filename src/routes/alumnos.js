const express = require("express");
const router = express.Router();
const multer = require("multer");

const { validarAlumno } = require("../middlewares/validaciones");
const alumnosController = require("../controllers/alumnos");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", alumnosController.getAlumnos);
router.get("/:id", alumnosController.getAlumnoById);
router.post("/", validarAlumno, alumnosController.createAlumno);
router.put("/:id", validarAlumno, alumnosController.updateAlumno);
router.delete("/:id", alumnosController.deleteAlumno);

router.post(
  "/:id/fotoPerfil",
  upload.single("foto"),
  alumnosController.uploadFoto,
);

router.post("/:id/email", alumnosController.sendEmail);

router.post("/:id/session/login", alumnosController.login);
router.post("/:id/session/verify", alumnosController.verifySession);
router.post("/:id/session/logout", alumnosController.logout);

router.all("/", (req, res) =>
  res.status(405).json({ error: "Método no permitido" }),
);
router.all("/:id", (req, res) =>
  res.status(405).json({ error: "Método no permitido" }),
);

module.exports = router;
