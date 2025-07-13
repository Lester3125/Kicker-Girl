const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const referenceIds = [5640264805, 8914927540];
const grayOrWhiteColors = [119085916, 119085909];

function isGrayOrWhiteSkin(description) {
  const parts = [
    description.headColorId,
    description.leftArmColorId,
    description.rightArmColorId,
    description.leftLegColorId,
    description.rightLegColorId,
    description.torsoColorId
  ];
  return parts.every(color => grayOrWhiteColors.includes(color));
}

function compareAvatars(target, reference) {
  if (target.shirtAssetId !== reference.shirtAssetId) return false;
  if (target.pantsAssetId !== reference.pantsAssetId) return false;

  const accA = [...target.accessoryAssetIds].sort();
  const accB = [...reference.accessoryAssetIds].sort();
  if (JSON.stringify(accA) !== JSON.stringify(accB)) return false;

  if (!isGrayOrWhiteSkin(target)) return false;
  return true;
}

async function getAvatar(userId) {
  try {
    const res = await axios.get(`https://avatar.roblox.com/v1/users/${userId}/avatar`);
    return res.data;
  } catch (err) {
    console.warn(`⚠️ Failed to fetch avatar for userId: ${userId} - ${err.response?.status || err.message}`);
    return null;
  }
}

app.post("/check-avatar", async (req, res) => {
  const { userId } = req.body;

  if (!userId || typeof userId !== "number") {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const targetAvatar = await getAvatar(userId);
    if (!targetAvatar) return res.status(500).json({ error: "Failed to load target avatar" });

    for (const refId of referenceIds) {
      const refAvatar = await getAvatar(refId);
      if (!refAvatar) continue; // skip broken reference avatars

      if (compareAvatars(targetAvatar, refAvatar)) {
        return res.json({ match: true });
      }
    }

    res.json({ match: false });
  } catch (err) {
    console.error("❌ Fatal error:", err.message || err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Avatar checker running on port ${PORT}`));
