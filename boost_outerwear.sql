-- Boost Outerwear signals to ensure detection
UPDATE style_signals 
SET weight = 0.5 
WHERE signal_value IN ('puffer', 'down vest', 'down jacket') AND weight < 0.5;
