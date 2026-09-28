const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'node_modules', '@nozbe', 'watermelondb', 'native', 'ios', 'WatermelonDB');
const header = path.join(root, 'JSIInstaller.h');
const source = path.join(root, 'JSIInstaller.mm');
const bridge = path.join(root, 'objc', 'WMDatabaseBridge.m');

if (!fs.existsSync(header)) {
  process.exit(0);
}

const headerText = fs.readFileSync(header, 'utf8');
if (!headerText.includes('RCTCxxBridge')) {
  process.exit(0);
}

fs.writeFileSync(
  header,
  `#pragma once

#import <Foundation/Foundation.h>

#ifdef __cplusplus
extern "C"
{
#endif

void installWatermelonJSI(void);
void watermelondbProvideSyncJson(int id, NSData *json, NSError **errorPtr);

#ifdef __cplusplus
} // extern "C"
#endif
`,
);

fs.writeFileSync(
  source,
  `#import "JSIInstaller.h"

extern "C" void installWatermelonJSI(void) {}
`,
);

const bridgeText = fs.readFileSync(bridge, 'utf8');
fs.writeFileSync(
  bridge,
  bridgeText.replace(
    /RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD\(initializeJSI\)\s*\{[\s\S]*?return @YES;\s*\}/,
    `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(initializeJSI)
{
    return @NO;
}`,
  ),
);
