const { bodyOf, getBlobStore, handleError, json, keyForUid, methodGuard, readJson, verifyAccessToken, writeJson } = require("./_pi");

exports.handler = async (event) => {
  try {
    methodGuard(event);
    const { accessToken } = bodyOf(event);
    const user = await verifyAccessToken(accessToken);
    const store = await getBlobStore();
    const uidKey = keyForUid(user.uid);
    await writeJson(store, "sessions/" + uidKey + ".json", {
      uid: user.uid,
      username: user.username,
      wallet_address: user.wallet_address,
      updatedAt: new Date().toISOString()
    });
    const claim = await readJson(store, "claims/" + uidKey + ".json");
    return json(200, {
      uid: user.uid,
      username: user.username,
      wallet_address: user.wallet_address,
      claimed: Boolean(claim && claim.status === "claimed"),
      claimStatus: claim && claim.status ? claim.status : "not_claimed"
    });
  } catch (error) {
    return handleError(error);
  }
};
