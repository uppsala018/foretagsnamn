<?php
$apiKey = 'sk_test_WfZq9OagexY3ON9Ts5iqb0cdwwO7t988';   // byt till live senare
$baseUrl = 'https://cloud.hostup.se';

function hostup_check_domains($domains) {
    global $apiKey, $baseUrl;

    // 1. Starta check
    $ch = curl_init($baseUrl . '/api/v2/domains/availability');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['names' => $domains]));
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 && $httpCode !== 202) {
        return ['error' => 'API-fel: ' . $httpCode];
    }

    $data = json_decode($response, true);
    $pollUrl = $baseUrl . $data['operation']['pollUrl'];

    // 2. Polla tills klart (max 15 sek)
    for ($i = 0; $i < 15; $i++) {
        sleep(1);
        $ch = curl_init($pollUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Accept: application/json'
        ]);
        $result = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200) {
            $final = json_decode($result, true);
            if (isset($final['status']) && $final['status'] === 'completed') {
                // Gör om till snyggt format för din sajt
                $nice = [];
                foreach ($final['data'] as $item) {
                    $nice[$item['name']] = [
                        'available'     => $item['available'],
                        'price'         => $item['billing']['amount'] ?? null,
                        'currency'      => $item['currencyCode'],
                        'canRegister'   => $item['actions']['canRegister']['allowed'],
                        'reason'        => $item['reason'] ?? null,
                        'requirements'  => $item['registryRequirements']['registration'] ?? []
                    ];
                }
                return $nice;
            }
        }
    }
    return ['error' => 'Timeout'];
}

// Exempel på användning i din kod
$domainer = ["foretagsnamn.se", "foretagsnamn.nu", "test123.se"];
$result = hostup_check_domains($domainer);

print_r($result);   // ← här ser du exakt vad du kan visa på sajten