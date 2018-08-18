import * as process from "process";
import { ProcessFunctionCall } from "./process-cloudify";
import { FunctionReturn, moduleWrapper, registerModule } from "../trampoline";

process.on("message", async ({ call, serverModule, timeout }: ProcessFunctionCall) => {
    const executionStart = Date.now();

    const timer = setTimeout(() => {
        console.error(`Cloudify process timed out after ${timeout}s`);

        const timeoutReturn: FunctionReturn = moduleWrapper.createErrorResponse(
            new Error(`Function timed out after ${timeout}s`),
            call,
            executionStart
        );
        process.send!(timeoutReturn);
        process.disconnect();
        process.exit();
    }, timeout * 1000);

    try {
        const mod = require(serverModule);
        if (!mod) {
            throw new Error(`Could not find module '${serverModule}'`);
        }
        registerModule(mod);
        const ret = await moduleWrapper.execute(call);
        process.send!(ret);
    } catch (err) {
        console.error(err);
    } finally {
        clearTimeout(timer);
        process.disconnect();
    }
});
