const assert = require('chai').assert;
const app = require('../lib/index');
const fs = require('fs');
const moment = require('moment');
let rawOutput = require('./inputs/raw').rawOutput;
let rawInput = require('./inputs/raw').rawInput;
let expectedOutput=require('./inputs/raw').expected;
let durationResult = app.calculateDuration(rawOutput);
let undefinedResult = app.calculateDuration(undefined);
let temp = rawOutput;
temp["77902601451"].revokes = []
let revokeResult = app.calculateDuration(temp);

describe('calculate subscription account from each partners', () => {
    it('should accept only object typeof as input', () => {
        assert.equal(Object.keys(undefinedResult.subscriptions).length, 0);
    })
    it('should return object', () => {
        assert.isObject(durationResult);
    })
    // case III
    // Partner A issues a GRANT to Hussain for 3 months.
    // Partner B issues a GRANT to Hussain 4 months later.
    // Hussain is still owned by Partner A, so Partner B's Offer is ignored

    // case IV
    // Partner A issues a GRANT to Hussain for 3 months.
    // Partner B issues a GRANT to Hussain 4 months later.

    // Hussain is still owned by Partner A, so Partner B's Offer is ignored
    it('for Hussain should not be available for other partner if not revoked by current owner of account', () => {
        assert.equal(Object.keys(revokeResult.subscriptions.Hussain).length, 1);
    })
    // case V
    // Partner A issues a GRANT to Hussain for 4 months.
    // Partner A issues a GRANT to Hussain for 6 months, 3 months later.
    // Hussain has 10 months free iflix from Partner A.
    it('for Hussain if never revoked by partner then all the duration should be accumalted', () => {
        assert.isAbove(revokeResult.subscriptions.Hussain.amazecom,  expectedOutput.subscriptions.Hussain.Amazecom);
    })

})
describe("test integration# rawData to final output", () => {
    let output;
    let final;
    before((done) => {
        app.generateRawData(rawInput).then(result => {
            output = result;
            final = app.calculateDuration(output);
            done();
        })
    })

    // case I
    // Partner A issues a GRANT to Hussain for 1 months.
    // Partner A issues a GRANT to Hussain for 2 months.
    // Partner A issues a REVOKE to Hussain for 2 months after first
    //  Hussain gets 2 months from Partner A 
    it('for Hussain after revoke total duration of amazecom should be calculated upto revoke date', () => {
        assert.equal(final.subscriptions.Hussain.amazecom, expectedOutput.subscriptions.Hussain.Amazecom);
    })
    // case II
    // Partner A issues a GRANT to Hussain for 3 months.
    // Partner A issues a REVOKE to Hussain 2 months later.
    // Partner B issues a GRANT to Hussain for 2 months at the exact same time or after  the REVOKE was issued.
    // Hussain gets 2 months from Partner A and 2 months from Partner B.
    it('for Hussain after revoke account shoult be available for  wondertel to own and if grant is valid; account should have 2 subscriptions from partners', () => {
        assert.equal(Object.keys(final.subscriptions.Hussain).length, Object.keys(expectedOutput.subscriptions.Hussain).length);
    })



})