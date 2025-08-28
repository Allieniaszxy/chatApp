import multer from "multer";
const upload = multer({ dest: "uploads/" });

// send image
router.post(
  "/:groupId/image",
  auth,
  upload.single("image"),
  async (req, res) => {
    const msg = await Message.create({
      group: req.params.groupId,
      sender: req.user.id,
      text: "",
      imageUrl: `/uploads/${req.file.filename}`,
    });
    res.json(msg);
  }
);

// send voice note
router.post(
  "/:groupId/voice",
  auth,
  upload.single("voice"),
  async (req, res) => {
    const msg = await Message.create({
      group: req.params.groupId,
      sender: req.user.id,
      text: "",
      voiceUrl: `/uploads/${req.file.filename}`,
    });
    res.json(msg);
  }
);
