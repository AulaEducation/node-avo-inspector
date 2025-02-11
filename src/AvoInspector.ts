import { AvoInspectorEnv, AvoInspectorEnvValueType } from "./AvoInspectorEnv";
import { AvoSchemaParser } from "./AvoSchemaParser";
import { AvoNetworkCallsHandler } from "./AvoNetworkCallsHandler";
import { AvoDeduplicator } from "./AvoDeduplicator";

import { isValueEmpty } from "./utils";
import { AvoGuid } from "./AvoGuid";

const libVersion = require("../package.json").version;

export class AvoInspector {
  environment: AvoInspectorEnvValueType;
  avoNetworkCallsHandler: AvoNetworkCallsHandler;
  avoDeduplicator: AvoDeduplicator;
  apiKey: string;
  version: string;

  private static _shouldLog = false;
  static get shouldLog() {
    return this._shouldLog;
  }
  static set shouldLog(enable) {
    this._shouldLog = enable;
  }

  constructor(options: {
    apiKey: string;
    env: AvoInspectorEnvValueType;
    version: string;
    appName?: string;
  }) {
    // the constructor does aggressive null/undefined checking because same code paths will be accessible from JS
    if (isValueEmpty(options.env)) {
      this.environment = AvoInspectorEnv.Dev;
      console.warn(
        "[Avo Inspector] No environment provided. Defaulting to dev."
      );
    } else if (Object.values(AvoInspectorEnv).indexOf(options.env) === -1) {
      this.environment = AvoInspectorEnv.Dev;
      console.warn(
        "[Avo Inspector] Unsupported environment provided. Defaulting to dev. Supported environments - Dev, Staging, Prod."
      );
    } else {
      this.environment = options.env;
    }

    if (isValueEmpty(options.apiKey)) {
      throw new Error(
        "[Avo Inspector] No API key provided. Inspector can't operate without API key."
      );
    } else {
      this.apiKey = options.apiKey;
    }

    if (isValueEmpty(options.version)) {
      throw new Error(
        "[Avo Inspector] No version provided. Many features of Inspector rely on versioning. Please provide comparable string version, i.e. integer or semantic."
      );
    } else {
      this.version = options.version;
    }

    if (this.environment === AvoInspectorEnv.Dev) {
      AvoInspector._shouldLog = true;
    } else {
      AvoInspector._shouldLog = false;
    }

    this.avoNetworkCallsHandler = new AvoNetworkCallsHandler(
      this.apiKey,
      this.environment.toString(),
      options.appName || "",
      this.version,
      libVersion
    );
    this.avoDeduplicator = new AvoDeduplicator();
  }

  trackSchemaFromEvent(
    eventName: string,
    eventProperties: { [propName: string]: any }
  ): Promise<
    Array<{
      propertyName: string;
      propertyType: string;
      children?: any;
    }>
  > {
    try {
      if (
        this.avoDeduplicator.shouldRegisterEvent(
          eventName,
          eventProperties,
          false
        )
      ) {
        if (AvoInspector.shouldLog) {
          console.log(
            "Avo Inspector: supplied event " +
            eventName +
            " with params " +
            JSON.stringify(eventProperties)
          );
        }
        let eventSchema = this.extractSchema(eventProperties, false);
        return this.trackSchemaInternal(
          eventName,
          eventSchema,
          null,
          null
        ).then(() => {
          return eventSchema;
        });
      } else {
        if (AvoInspector.shouldLog) {
          console.log("Avo Inspector: Deduplicated event: " + eventName);
        }
        return Promise.resolve([]);
      }
    } catch (e) {
      console.error(
        "Avo Inspector: something went wrong. Please report to support@avo.app.",
        e
      );
      return Promise.reject(
        "Avo Inspector: something went wrong. Please report to support@avo.app."
      );
    }
  }

  private _avoFunctionTrackSchemaFromEvent(
    eventName: string,
    eventProperties: { [propName: string]: any },
    eventId: string,
    eventHash: string
  ): Promise<
    Array<{
      propertyName: string;
      propertyType: string;
      children?: any;
    }>
  > {
    try {
      if (
        this.avoDeduplicator.shouldRegisterEvent(
          eventName,
          eventProperties,
          true
        )
      ) {
        if (AvoInspector.shouldLog) {
          console.log(
            "Avo Inspector: supplied event " +
            eventName +
            " with params " +
            JSON.stringify(eventProperties)
          );
        }
        let eventSchema = this.extractSchema(eventProperties, false);
        return this.trackSchemaInternal(
          eventName,
          eventSchema,
          eventId,
          eventHash
        ).then(() => {
          return eventSchema;
        });
      } else {
        if (AvoInspector.shouldLog) {
          console.log("Avo Inspector: Deduplicated event: " + eventName);
        }
        return Promise.resolve([]);
      }
    } catch (e) {
      console.error(
        "Avo Inspector: something went wrong. Please report to support@avo.app.",
        e
      );
      return Promise.reject(
        "Avo Inspector: something went wrong. Please report to support@avo.app."
      );
    }
  }

  private async trackSchemaInternal(
    eventName: string,
    eventSchema: Array<{
      propertyName: string;
      propertyType: string;
      children?: any;
    }>,
    eventId: string | null,
    eventHash: string | null
  ): Promise<void> {
    try {
      const seesionId = AvoGuid.newGuid();
      try {
        await this.avoNetworkCallsHandler
          .callInspectorWithBatchBody([
            this.avoNetworkCallsHandler.bodyForSessionStartedCall(seesionId),
          ]);
        if (AvoInspector.shouldLog) {
          console.log("Avo Inspector: session started sent successfully.");
        }

        await this.avoNetworkCallsHandler.callInspectorWithBatchBody([
          this.avoNetworkCallsHandler.bodyForEventSchemaCall(
            seesionId,
            eventName,
            eventSchema,
            eventId,
            eventHash
          ),
        ]);

        if (AvoInspector.shouldLog) {
          console.log("Avo Inspector: schema sent successfully.");
        }
      } catch (err) {
        if (AvoInspector.shouldLog) {
          console.log("Avo Inspector: schema sending failed: " + err + ".");
        }
      }
    } catch (e) {
      console.error(
        "Avo Inspector: something went wrong. Please report to support@avo.app.",
        e
      );
      return Promise.reject();
    }
  }

  enableLogging(enable: boolean) {
    AvoInspector._shouldLog = enable;
  }

  extractSchema(
    eventProperties: {
      [propName: string]: any;
    },
    shouldLogIfEnabled = true
  ): Array<{
    propertyName: string;
    propertyType: string;
    children?: any;
  }> {
    try {
      if (this.avoDeduplicator.hasSeenEventParams(eventProperties, true)) {
        if (shouldLogIfEnabled && AvoInspector.shouldLog) {
          console.warn(
            "Avo Inspector: WARNING! You are trying to extract schema shape that was just reported by your Codegen. " +
            "This is an indicator of duplicate inspector reporting. " +
            "Please reach out to support@avo.app for advice if you are not sure how to handle this."
          );
        }
      }

      if (AvoInspector.shouldLog) {
        console.log(
          "Avo Inspector: extracting schema from " +
          JSON.stringify(eventProperties)
        );
      }

      return AvoSchemaParser.extractSchema(eventProperties);
    } catch (e) {
      console.error(
        "Avo Inspector: something went wrong. Please report to support@avo.app.",
        e
      );
      return [];
    }
  }
}
