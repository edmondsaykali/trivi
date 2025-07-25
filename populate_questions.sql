-- Insert multiple choice questions
INSERT INTO questions (text, type, options, "correctAnswer", category) VALUES
('Which planet is known as the ''Red Planet''?', 'multiple_choice', '["Earth", "Mars", "Jupiter", "Venus"]', 1, 'Science'),
('What is the capital of France?', 'multiple_choice', '["London", "Berlin", "Paris", "Madrid"]', 2, 'Geography'),
('Who painted the Mona Lisa?', 'multiple_choice', '["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"]', 1, 'Art'),
('What is the largest ocean on Earth?', 'multiple_choice', '["Atlantic", "Indian", "Arctic", "Pacific"]', 3, 'Geography'),
('Which element has the chemical symbol ''O''?', 'multiple_choice', '["Gold", "Oxygen", "Silver", "Iron"]', 1, 'Science'),
('What is the smallest country in the world?', 'multiple_choice', '["Monaco", "Vatican City", "Nauru", "San Marino"]', 1, 'Geography'),
('Who wrote ''Romeo and Juliet''?', 'multiple_choice', '["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"]', 1, 'Literature'),
('What is the hardest natural substance on Earth?', 'multiple_choice', '["Gold", "Iron", "Diamond", "Quartz"]', 2, 'Science'),
('Which country invented pizza?', 'multiple_choice', '["France", "Italy", "Greece", "Spain"]', 1, 'Food'),
('What is the largest mammal in the world?', 'multiple_choice', '["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"]', 1, 'Animals');

-- Insert integer questions
INSERT INTO questions (text, type, "correctAnswer", category) VALUES
('How many countries are there in Europe?', 'integer', 44, 'Geography'),
('In what year did World War II end?', 'integer', 1945, 'History'),
('How many bones are in the adult human body?', 'integer', 206, 'Science'),
('What is the speed of light in km/s (rounded to nearest thousand)?', 'integer', 300000, 'Science'),
('How many players are on a basketball team on the court at one time?', 'integer', 5, 'Sports'),
('How many strings does a standard guitar have?', 'integer', 6, 'Music'),
('How many sides does a hexagon have?', 'integer', 6, 'Math'),
('In what year was the iPhone first released?', 'integer', 2007, 'Technology'),
('How many minutes are in a full day?', 'integer', 1440, 'Math'),
('How many continents are there?', 'integer', 7, 'Geography');