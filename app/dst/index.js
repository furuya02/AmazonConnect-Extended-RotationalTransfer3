"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
if (process.env.IsLocal == 'Yes') {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: 'developer' });
    AWS.config.update({ region: 'ap-northeast-1' });
}
const bucketName = process.env.BucketName;
const s3 = new AWS.S3();
const key = 'RotationalTransfer.txt';
exports.handler = (event, _context) => __awaiter(this, void 0, void 0, function* () {
    console.log(JSON.stringify(event));
    let counter = 0;
    if (event.Details.Parameters.counter) {
        counter = Number(event.Details.Parameters.counter);
    }
    // 設定情報の取得
    const data = yield s3.getObject({
        Bucket: bucketName,
        Key: key
    }).promise();
    if (data.Body) {
        const body = data.Body.toString();
        var lines = body.split('\n');
        // コメント削除及び、余分な空白削除
        lines = lines.map((line) => {
            return line.replace(/#.*$/, '').replace(/\s+$/, '');
        });
        // 無効（空白）行の削除
        lines = lines.filter((line) => {
            return line != '';
        });
        const rules = GetRule(lines);
        if (rules.length <= counter) {
            counter = 0;
        }
        const phoneNumber = rules[counter].phoneNumber;
        const message = rules[counter].message;
        const timeOut = rules[counter].timeOut;
        console.log('message: ' + message);
        console.log('phoneNumber: ' + phoneNumber);
        console.log('timeOut: ' + timeOut);
        counter++;
        return {
            message: `<speak>${message}</speak>`,
            phoneNumber: phoneNumber,
            timeOut: timeOut,
            counter: counter
        };
    }
    throw new Error('Configration falid. [${key}]');
});
function GetRule(lines) {
    // 現在時間
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const week = now.getDay();
    const hour = ("0" + (now.getHours())).slice(-2);
    const miniute = ("0" + (now.getMinutes())).slice(-2);
    var weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    console.log('現在時間: ' + month + '/' + day + '(' + weekdays[week] + ') ' + hour + ':' + miniute);
    //[TELNO]の読み込み
    let result = ReadPart(lines, 'TELNO');
    const phoneNumbers = result.map((l) => {
        return l.split(',')[1];
    });
    //[DEFAULT]の読み込み
    result = ReadPart(lines, 'DEFAULT');
    for (var i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.indexOf('[SET]') == 0) {
            const target = line.substring(5);
            const tmp = target.split(',');
            if (weekdays[week] == tmp[0]) {
                const startTime = Number(tmp[1]);
                const endTime = Number(tmp[2]);
                const nowTime = Number(hour + miniute);
                if (startTime <= nowTime && nowTime < endTime) {
                    // 該当する
                    result = [];
                    for (var t = i + 1; t < lines.length; t++) {
                        if (lines[t].indexOf('[/SET]') == 0) {
                            break;
                        }
                        result.push(lines[t]);
                    }
                    break;
                }
            }
        }
    }
    return result.map((l) => {
        const tmp = l.split(',');
        return new Rule(phoneNumbers[Number(tmp[0])], Number(tmp[1]), tmp[2]);
    });
}
function ReadPart(lines, tag) {
    const result = [];
    let flg = false;
    for (var i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.indexOf('[' + tag) == 0) {
            flg = true;
        }
        else if (line.indexOf('[/' + tag) == 0) {
            break;
        }
        else {
            if (flg) {
                result.push(line);
            }
        }
    }
    return result;
}
class Rule {
    constructor(phoneNumber, timeOut, message) {
        this.phoneNumber = phoneNumber;
        this.timeOut = timeOut;
        this.message = message;
    }
}
//# sourceMappingURL=index.js.map