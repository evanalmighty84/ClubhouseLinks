'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {processOne} = require('../lookaround-worker.cjs');
const modeControls = require('../services/houseImageMode');

function response(body, status = 200) {
    return {status, ok: status >= 200 && status < 300, json: async () => body};
}
const claimed = {
    resident_id: 960, latitude: 32.9872062, longitude: -96.6788781,
    lease_token: 'b20c65b3-8439-459d-bd59-129be38791d6', mode: 'test'
};
const fakeUpload = {
    secure_url: 'https://res.cloudinary.com/test/image/upload/test_image.png',
    public_id: 'synthetic-test-123'
};

test('off is the default and licensed needs explicit gate', () => {
    const priorMode = process.env.HOUSE_IMAGE_PIPELINE_MODE;
    const priorTest = process.env.HOUSE_IMAGE_TEST_RESIDENT_ID;
    const priorAuth = process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED;
    try {
        delete process.env.HOUSE_IMAGE_PIPELINE_MODE;
        assert.equal(modeControls.mode(), 'off');
        assert.equal(modeControls.processingAllowed(), false);
        process.env.HOUSE_IMAGE_PIPELINE_MODE = 'test';
        delete process.env.HOUSE_IMAGE_TEST_RESIDENT_ID;
        assert.equal(modeControls.processingAllowed(), false);
        process.env.HOUSE_IMAGE_TEST_RESIDENT_ID = '960';
        assert.equal(modeControls.processingAllowed(), true);
        process.env.HOUSE_IMAGE_PIPELINE_MODE = 'licensed';
        delete process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED;
        assert.equal(modeControls.processingAllowed(), false);
        process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED = 'yes';
        assert.equal(modeControls.processingAllowed(), true);
    } finally {
        if (priorMode === undefined) delete process.env.HOUSE_IMAGE_PIPELINE_MODE;
        else process.env.HOUSE_IMAGE_PIPELINE_MODE = priorMode;
        if (priorTest === undefined) delete process.env.HOUSE_IMAGE_TEST_RESIDENT_ID;
        else process.env.HOUSE_IMAGE_TEST_RESIDENT_ID = priorTest;
        if (priorAuth === undefined) delete process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED;
        else process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED = priorAuth;
    }
});

test('test image path claims, captures, uploads and saves with test source', async () => {
    const calls = [];
    const result = await processOne({
        mode: 'test', onlyResident: '960',
        capture: async () => true,
        upload: async () => fakeUpload,
        discard: async () => assert.fail('should not discard successful upload'),
        api: async (path, verb, body) => {
            calls.push({path, verb, body});
            if (path.endsWith('/claim')) return response({job: claimed});
            if (path.endsWith('/house-image')) {
                assert.equal(body.source, 'test_placeholder');
                assert.equal(body.mode, 'test');
                return response({success: true, resident: {house_image_url: fakeUpload.secure_url}});
            }
            throw Error('Unexpected request ' + path);
        }
    });
    assert.equal(result, 'saved');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.resident_id, '960');
    assert.equal(calls[0].body.mode, 'test');
});

test('test mode reports no coverage without uploading image', async () => {
    const seen = [];
    const result = await processOne({
        mode: 'test', onlyResident: '960',
        capture: async () => false,
        upload: async () => assert.fail('should not upload'),
        discard: async () => {},
        api: async (path, verb, body) => {
            seen.push(body);
            return path.endsWith('/claim')
                ? response({job: claimed})
                : response({success: true, status: 'no_coverage'});
        }
    });
    assert.equal(result, 'no_coverage');
    assert.equal(seen[1].outcome, 'no_coverage');
    assert.equal(seen[1].mode, 'test');
});

test('capture error requests retry without attempting save', async () => {
    const seen = [];
    const result = await processOne({
        mode: 'test', onlyResident: '960',
        capture: async () => { throw Error('Synthetic failure'); },
        upload: async () => assert.fail('should not upload'),
        discard: async () => {},
        api: async (path, verb, body) => {
            seen.push(path);
            return path.endsWith('/claim')
                ? response({job: claimed})
                : response({success: true, status: 'queued'});
        }
    });
    assert.equal(result, 'queued');
    assert.equal(seen.length, 2);
    assert.match(seen[1], /report$/);
});

test('server mode mismatch blocks capture', async () => {
    await assert.rejects(
        () => processOne({
            mode: 'licensed', onlyResident: '960',
            api: async () => response({job: claimed}),
            capture: async () => assert.fail('should not capture'),
            upload: async () => {},
            discard: async () => {}
        }),
        /mode does not match/
    );
});

test('idle queue does not capture or upload', async () => {
    const status = await processOne({
        mode: 'test', onlyResident: '960',
        api: async () => response({job: null}),
        capture: async () => assert.fail('should not capture'),
        upload: async () => assert.fail('should not upload'),
        discard: async () => {}
    });
    assert.equal(status, 'idle');
});
