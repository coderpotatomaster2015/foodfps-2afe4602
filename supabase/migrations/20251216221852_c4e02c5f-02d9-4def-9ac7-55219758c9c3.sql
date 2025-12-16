-- Add monthly updates with seasonal boss skins and backgrounds
INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'January Frost Update',
  'New frost boss with ice-blue skin, snowy battlefield background, and exclusive Ice Warrior skin purchasable with gems.',
  'Frost boss, snowy background, Ice Warrior skin!',
  false, false, true, 'january',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'February Valentine Update',
  'Heart-themed boss with pink/red skin, romantic battlefield with hearts, and exclusive Cupid skin purchasable with coins.',
  'Valentine boss, heart decorations, Cupid skin!',
  false, false, true, 'february',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'March Spring Update',
  'Flower boss with green/floral skin, blooming meadow background, and exclusive Spring Bloom skin.',
  'Flower boss, meadow map, Spring Bloom skin!',
  false, false, true, 'march',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'April Fool Update',
  'Jester boss with rainbow skin, carnival battlefield, and exclusive Trickster skin purchasable with gold.',
  'Jester boss, carnival theme, Trickster skin!',
  false, false, true, 'april',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'May Military Update',
  'Tank boss with camo skin, military base battlefield, and exclusive Soldier skin.',
  'Tank boss, military map, Soldier skin!',
  false, false, true, 'may',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'June Summer Update',
  'Beach boss with surfboard, tropical island background, and exclusive Beach Bum skin purchasable with gems.',
  'Beach boss, island map, Beach Bum skin!',
  false, false, true, 'june',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'July Fireworks Update',
  'Explosive boss with firework effects, night sky battlefield, and exclusive Pyro skin.',
  'Firework boss, night map, Pyro skin!',
  false, false, true, 'july',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'August Solar Update',
  'Sun boss with golden skin, desert battlefield, and exclusive Sun King skin purchasable with gold.',
  'Sun boss, desert map, Sun King skin!',
  false, false, true, 'august',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'September School Update',
  'Professor boss with blackboard attacks, school battlefield, and exclusive Nerd skin.',
  'Professor boss, school map, Nerd skin!',
  false, false, true, 'september',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'October Spooky Update',
  'Vampire boss with bat swarm attacks, haunted graveyard background, and exclusive Undead skin purchasable with gems.',
  'Vampire boss, graveyard map, Undead skin!',
  false, false, true, 'october',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'November Harvest Update',
  'Scarecrow boss with pumpkin attacks, farm battlefield, and exclusive Farmer skin.',
  'Scarecrow boss, farm map, Farmer skin!',
  false, false, true, 'november',
  user_id
FROM profiles LIMIT 1;

INSERT INTO game_updates (name, description, summary, is_released, is_beta, is_seasonal, season, created_by)
SELECT 
  'December Winter Update',
  'Snowman boss with blizzard attacks, winter wonderland background, and exclusive Santa skin purchasable with coins.',
  'Snowman boss, winter map, Santa skin!',
  false, false, true, 'december',
  user_id
FROM profiles LIMIT 1;

-- Add monthly skins to player_skins
INSERT INTO player_skins (name, color, price_gems, price_coins, price_gold, is_seasonal, season) VALUES
('Ice Warrior', '#00CED1', 150, 0, 0, true, 'january'),
('Cupid', '#FF69B4', 0, 2000, 0, true, 'february'),
('Spring Bloom', '#90EE90', 100, 1500, 0, true, 'march'),
('Trickster', '#FFD700', 0, 0, 50, true, 'april'),
('Soldier', '#556B2F', 120, 1800, 0, true, 'may'),
('Beach Bum', '#FF8C00', 130, 0, 0, true, 'june'),
('Pyro', '#FF4500', 0, 2500, 0, true, 'july'),
('Sun King', '#DAA520', 0, 0, 75, true, 'august'),
('Nerd', '#8B4513', 80, 1200, 0, true, 'september'),
('Undead', '#4B0082', 200, 0, 0, true, 'october'),
('Farmer', '#8B0000', 0, 1600, 0, true, 'november'),
('Santa', '#DC143C', 0, 3000, 0, true, 'december')
ON CONFLICT DO NOTHING;