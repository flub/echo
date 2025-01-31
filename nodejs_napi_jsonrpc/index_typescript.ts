import {
  openDeltaChatInstance,
  T,
  BaseDeltaChat,
  C,
} from "@deltachat/napi-jsonrpc";

async function main() {
  const dc: BaseDeltaChat<any> = await openDeltaChatInstance(
    "./deltachat-data"
  );

  // log all events to console
  dc.on("ALL", console.debug.bind("[core]"));

  // or only log what you want
  // dc.on("Info", console.info.bind("[core]"))
  // dc.on("Warning", console.warn.bind("[core]"))
  // dc.on("Error", console.error.bind("[core]"))

  let firstAccount: T.Account | undefined = (await dc.rpc.getAllAccounts())[0];
  if (!firstAccount) {
    firstAccount = await dc.rpc.getAccountInfo(await dc.rpc.addAccount());
  }
  if (firstAccount.type === "Unconfigured") {
    console.info("account not configured, trying to login now...");
    try {
      if (!!process.env.ADDR && !!process.env.MAIL_PW) {
        await dc.rpc.batchSetConfig(firstAccount.id, {
          addr: process.env.ADDR,
          mail_pw: process.env.MAIL_PW,
        });
      } else {
        throw new Error(
          "Credentials missing, you need to set ADDR and MAIL_PW"
        );
      }
      await dc.rpc.batchSetConfig(firstAccount.id, {
        bot: "true",
        e2ee_enabled: "true",
      });
      await dc.rpc.configure(firstAccount.id);
    } catch (error) {
      console.error("Could not log in to account:", error);
      process.exit(1);
    }
  }

  const botAccountId = firstAccount.id;
  const emitter = dc.getContextEvents(botAccountId);
  emitter.on("IncomingMsg", async ({ chatId, msgId }) => {
    const chat = await dc.rpc.getBasicChatInfo(botAccountId, chatId);
    // only echo to DM chat
    if (chat.chatType === C.DC_CHAT_TYPE_SINGLE) {
      const message = await dc.rpc.messageGetMessage(botAccountId, msgId);
      await dc.rpc.miscSendTextMessage(
        botAccountId,
        message.text || "",
        chatId
      );
    }
  });
}

main();
