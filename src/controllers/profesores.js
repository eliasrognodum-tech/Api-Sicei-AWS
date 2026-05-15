const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/aws");

const Profesor = sequelize.define(
  "Profesor",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombres: DataTypes.STRING,
    apellidos: DataTypes.STRING,
    numeroEmpleado: DataTypes.STRING,
    horasClase: DataTypes.INTEGER,
  },
  {
    timestamps: false,
  },
);

const getProfesores = async (req, res) => {
  const profesores = await Profesor.findAll();
  res.status(200).json(profesores);
};

const getProfesorById = async (req, res) => {
  const prof = await Profesor.findByPk(req.params.id);
  if (prof) res.status(200).json(prof);
  else res.status(404).json({ error: "No encontrado" });
};

const createProfesor = async (req, res) => {
  try {
    const nuevo = await Profesor.create(req.body);
    res.status(201).json(nuevo);
  } catch (e) {
    res.status(400).json({ error: "Error al guardar en base de datos" });
  }
};

const updateProfesor = async (req, res) => {
  const prof = await Profesor.findByPk(req.params.id);
  if (!prof) return res.status(404).json({ error: "No encontrado" });

  await prof.update(req.body);
  res.status(200).json(prof);
};

const deleteProfesor = async (req, res) => {
  const eliminados = await Profesor.destroy({ where: { id: req.params.id } });
  if (eliminados > 0)
    res.status(200).json({ mensaje: "Eliminado exitosamente" });
  else res.status(404).json({ error: "No encontrado" });
};

module.exports = {
  Profesor,
  getProfesores,
  getProfesorById,
  createProfesor,
  updateProfesor,
  deleteProfesor,
};
