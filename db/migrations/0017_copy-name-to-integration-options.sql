-- Custom SQL migration file, put your code below! --
UPDATE integrations
SET options = json_set(options, '$.name', name)
WHERE integrations.options NOT NULL;