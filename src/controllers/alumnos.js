const { DataTypes } = require("sequelize");
const { sequelize, s3Client, snsClient, docClient } = require("../config/aws");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { PublishCommand } = require("@aws-sdk/client-sns");
const {
  PutCommand,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const Alumno = sequelize.define(
  "Alumno",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombres: DataTypes.STRING,
    apellidos: DataTypes.STRING,
    matricula: DataTypes.STRING,
    promedio: DataTypes.FLOAT,
    password: DataTypes.STRING,
    fotoPerfilUrl: DataTypes.STRING,
  },
  {
    timestamps: false,
  },
);

const getAlumnos = async (req, res) => {
  const alumnos = await Alumno.findAll();
  res.status(200).json(alumnos);
};

const getAlumnoById = async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);
  if (alumno) res.status(200).json(alumno);
  else res.status(404).json({ error: "No encontrado" });
};

const createAlumno = async (req, res) => {
  try {
    const nuevo = await Alumno.create(req.body);
    res.status(201).json(nuevo);
  } catch (e) {
    res.status(400).json({ error: "Error al guardar en base de datos" });
  }
};

const updateAlumno = async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);
  if (!alumno) return res.status(404).json({ error: "No encontrado" });

  await alumno.update(req.body);
  res.status(200).json(alumno);
};

const deleteAlumno = async (req, res) => {
  const eliminados = await Alumno.destroy({ where: { id: req.params.id } });
  if (eliminados > 0) res.status(200).json({ mensaje: "Eliminado" });
  else res.status(404).json({ error: "No encontrado" });
};

const uploadFoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se subió foto" });

  const alumno = await Alumno.findByPk(req.params.id);
  if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });

  const key = `alumnos/${req.params.id}-${Date.now()}.jpg`;
  const bucket = process.env.S3_BUCKET_NAME; // Usando tu variable segura

  try {
    // Subir a S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: "public-read",
      }),
    );

    const fotoPerfilUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
    await alumno.update({ fotoPerfilUrl });

    res.status(200).json({ fotoPerfilUrl });
  } catch (error) {
    res.status(500).json({ error: "Error al subir a S3" });
  }
};

const sendEmail = async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);
  if (!alumno) return res.status(404).json({ error: "No encontrado" });

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN, // Usando tu variable segura
        Message: `Hola ${alumno.nombres} ${alumno.apellidos}. \nTus calificaciones están listas.\nPromedio: ${alumno.promedio}`,
        Subject: "Calificaciones SICEI - AWS",
      }),
    );
    res.status(200).json({ mensaje: "Correo enviado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar el correo" });
  }
};

const login = async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);

  if (!alumno || alumno.password !== req.body.password) {
    return res.status(400).json({ error: "Credenciales inválidas" });
  }

  const sessionString = crypto.randomBytes(64).toString("hex");

  try {
    await docClient.send(
      new PutCommand({
        TableName: "sesiones-alumnos",
        Item: {
          id: uuidv4(),
          fecha: Date.now(),
          alumnoId: parseInt(req.params.id),
          active: true,
          sessionString: sessionString,
        },
      }),
    );
    res.status(200).json({ sessionString });
  } catch (error) {
    res.status(500).json({ error: "Error en DynamoDB" });
  }
};

const verifySession = async (req, res) => {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: "sesiones-alumnos",
        FilterExpression: "sessionString = :s AND alumnoId = :a",
        ExpressionAttributeValues: {
          ":s": req.body.sessionString,
          ":a": parseInt(req.params.id),
        },
      }),
    );

    if (result.Items.length > 0 && result.Items[0].active === true) {
      res.status(200).json({ valido: true });
    } else {
      res.status(400).json({ error: "Sesión inválida o expirada" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error en DynamoDB" });
  }
};

const logout = async (req, res) => {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: "sesiones-alumnos",
        FilterExpression: "sessionString = :s AND alumnoId = :a",
        ExpressionAttributeValues: {
          ":s": req.body.sessionString,
          ":a": parseInt(req.params.id),
        },
      }),
    );

    if (result.Items.length > 0) {
      await docClient.send(
        new UpdateCommand({
          TableName: "sesiones-alumnos",
          Key: { id: result.Items[0].id },
          UpdateExpression: "set active = :act",
          ExpressionAttributeValues: { ":act": false },
        }),
      );
      res.status(200).json({ mensaje: "Logout exitoso" });
    } else {
      res.status(400).json({ error: "Sesión no encontrada" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al cerrar sesión" });
  }
};

module.exports = {
  Alumno,
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  uploadFoto,
  sendEmail,
  login,
  verifySession,
  logout,
};
