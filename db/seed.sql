INSERT INTO exercises (id, name, muscle_group, sets, reps, difficulty, rest_seconds, description, equipment, instructions)
VALUES
('bench', 'Barbell Bench Press', 'Chest', 4, '6-8', 'Intermediate', 120, 'A foundational horizontal press for chest and triceps strength.', 'Barbell', ARRAY['Set your feet and retract your shoulder blades.', 'Lower the bar with control to mid chest.', 'Press upward while keeping wrists stacked.']),
('dbpress', 'Incline Dumbbell Press', 'Chest', 3, '8-12', 'Intermediate', 90, 'An incline press emphasizing the upper chest.', 'Dumbbells', ARRAY['Set a bench to a gentle incline.', 'Lower dumbbells beside the upper chest.', 'Press up without clanging the weights.']),
('pushup', 'Push-Up', 'Chest', 3, '10-20', 'Beginner', 60, 'A scalable bodyweight press that also challenges the core.', 'Bodyweight', ARRAY['Brace in a straight plank.', 'Lower your chest toward the floor.', 'Push back up while keeping hips level.']),
('cablefly', 'Cable Chest Fly', 'Chest', 3, '12-15', 'Beginner', 60, 'A controlled cable movement for chest isolation.', 'Cables', ARRAY['Set handles around shoulder height.', 'Keep a soft bend in your elbows.', 'Bring hands together in a smooth arc.']),
('chestdip', 'Assisted Chest Dip', 'Chest', 3, '8-12', 'Intermediate', 90, 'A supported dip variation that targets the lower chest.', 'Machines', ARRAY['Set assistance to a manageable level.', 'Lean slightly forward and lower with control.', 'Press through the handles to return.']),
('deadlift', 'Conventional Deadlift', 'Back', 4, '4-6', 'Advanced', 150, 'A compound hinge developing posterior-chain strength.', 'Barbell', ARRAY['Stand with the bar over mid-foot.', 'Brace and hinge to grip the bar.', 'Drive through the floor and stand tall.']),
('pullup', 'Pull-Up', 'Back', 4, '5-10', 'Advanced', 120, 'A bodyweight vertical pull for lats and upper back.', 'Bodyweight', ARRAY['Begin from an active hang.', 'Pull your chest toward the bar.', 'Lower to a controlled hang.']),
('row', 'Barbell Bent-Over Row', 'Back', 4, '8-10', 'Intermediate', 90, 'A horizontal row for the lats and mid-back.', 'Barbell', ARRAY['Hinge with a neutral spine.', 'Row the bar toward your lower ribs.', 'Lower without changing your torso angle.']),
('latpd', 'Lat Pulldown', 'Back', 3, '10-12', 'Beginner', 75, 'A machine-based vertical pull for the lats.', 'Machines', ARRAY['Secure your thighs under the pad.', 'Pull the bar toward your upper chest.', 'Return overhead under control.']),
('dbrow', 'One-Arm Dumbbell Row', 'Back', 3, '10-12', 'Beginner', 60, 'A unilateral row for balanced back strength.', 'Dumbbells', ARRAY['Support yourself on a bench.', 'Pull the dumbbell toward your hip.', 'Lower to a comfortable stretch.']),
('squat', 'Barbell Back Squat', 'Legs', 4, '5-8', 'Intermediate', 150, 'A compound squat for quads and glutes.', 'Barbell', ARRAY['Set the bar securely across your upper back.', 'Brace and squat between your hips.', 'Drive through mid-foot to stand.']),
('rdl', 'Romanian Deadlift', 'Legs', 3, '8-10', 'Intermediate', 120, 'A hip hinge emphasizing hamstrings and glutes.', 'Barbell', ARRAY['Hold the bar at your thighs.', 'Push hips back with softly bent knees.', 'Stand by driving hips forward.']),
('lunge', 'Walking Lunge', 'Legs', 3, '10 per leg', 'Beginner', 75, 'A unilateral leg exercise for balance and strength.', 'Dumbbells', ARRAY['Take a comfortable step forward.', 'Lower until both knees are softly bent.', 'Push through the front foot and alternate.']),
('legpress', 'Leg Press', 'Legs', 3, '10-12', 'Beginner', 90, 'A guided machine press for lower-body strength.', 'Machines', ARRAY['Place feet shoulder-width on the platform.', 'Lower the platform with control.', 'Press without locking your knees.']),
('hipthrust', 'Barbell Hip Thrust', 'Legs', 3, '8-12', 'Intermediate', 90, 'A glute-focused hip extension exercise.', 'Barbell', ARRAY['Rest upper back against a bench.', 'Drive hips upward while bracing.', 'Pause briefly, then lower steadily.']),
('curl', 'Dumbbell Biceps Curl', 'Arms', 3, '10-12', 'Beginner', 45, 'An isolation exercise for elbow flexors.', 'Dumbbells', ARRAY['Stand tall with elbows near your sides.', 'Curl without swinging your torso.', 'Lower the weights slowly.']),
('hammer', 'Hammer Curl', 'Arms', 3, '10-12', 'Beginner', 45, 'A neutral-grip curl for biceps and forearms.', 'Dumbbells', ARRAY['Keep palms facing each other.', 'Curl while keeping elbows close.', 'Return to the start with control.']),
('dips', 'Parallel Bar Dips', 'Arms', 3, '8-12', 'Intermediate', 90, 'A bodyweight press emphasizing the triceps.', 'Bodyweight', ARRAY['Support yourself on parallel bars.', 'Lower only through a comfortable range.', 'Press back to a stable support.']),
('pushdown', 'Triceps Rope Pushdown', 'Arms', 3, '12-15', 'Beginner', 45, 'A cable isolation movement for the triceps.', 'Cables', ARRAY['Keep elbows tucked by your sides.', 'Extend the rope downward.', 'Return slowly without moving your shoulders.']),
('overheadtri', 'Overhead Triceps Extension', 'Arms', 3, '10-12', 'Intermediate', 60, 'An overhead extension for the triceps.', 'Dumbbells', ARRAY['Hold one dumbbell securely overhead.', 'Bend elbows to lower behind your head.', 'Extend elbows while keeping upper arms steady.']),
('plank', 'Forearm Plank', 'Core', 3, '30-60 seconds', 'Beginner', 45, 'An isometric trunk stability exercise.', 'Bodyweight', ARRAY['Place elbows under shoulders.', 'Keep a straight line from head to heels.', 'Brace and breathe steadily.']),
('crunch', 'Cable Crunch', 'Core', 3, '12-15', 'Intermediate', 60, 'A loaded trunk-flexion exercise.', 'Cables', ARRAY['Kneel facing a high cable.', 'Curl ribs toward hips.', 'Return slowly without pulling with your arms.']),
('legraise', 'Hanging Leg Raise', 'Core', 3, '8-12', 'Advanced', 60, 'A challenging trunk and hip-flexion exercise.', 'Bodyweight', ARRAY['Start from a controlled hang.', 'Raise knees or legs without swinging.', 'Lower smoothly to the start.']),
('russian', 'Russian Twist', 'Core', 3, '20 total', 'Beginner', 45, 'A controlled rotational trunk exercise.', 'Bodyweight', ARRAY['Sit tall with feet supported as needed.', 'Rotate your shoulders side to side.', 'Keep the movement controlled.']),
('deadbug', 'Dead Bug', 'Core', 3, '8 per side', 'Beginner', 45, 'A low-impact core stability movement.', 'Bodyweight', ARRAY['Lie on your back with arms raised.', 'Extend opposite arm and leg slowly.', 'Keep your lower back gently grounded.']),
('run', 'Treadmill Intervals', 'Cardio', 1, '20 minutes', 'Intermediate', 0, 'Alternating efforts on a treadmill for cardiovascular conditioning.', 'Machines', ARRAY['Warm up at an easy pace.', 'Alternate controlled faster and slower intervals.', 'Cool down gradually.']),
('rower', 'Rowing Machine', 'Cardio', 1, '15 minutes', 'Beginner', 0, 'A full-body cardio session on an indoor rower.', 'Machines', ARRAY['Sit tall and grip the handle.', 'Drive with legs before opening hips and pulling.', 'Recover in reverse order.']),
('jumprope', 'Jump Rope', 'Cardio', 5, '60 seconds', 'Beginner', 30, 'A rhythmic skipping interval for conditioning.', 'Bodyweight', ARRAY['Keep elbows near your sides.', 'Turn the rope with relaxed wrists.', 'Use small, soft hops.']),
('bike', 'Stationary Bike Ride', 'Cardio', 1, '25 minutes', 'Beginner', 0, 'A low-impact steady-state cycling session.', 'Machines', ARRAY['Adjust seat height before starting.', 'Begin with a comfortable resistance.', 'Maintain a steady cadence and cool down.']),
('elliptical', 'Elliptical Intervals', 'Cardio', 1, '20 minutes', 'Intermediate', 0, 'Low-impact cardio with alternating resistance intervals.', 'Machines', ARRAY['Stand tall and hold handles lightly.', 'Alternate moderate and brisk efforts.', 'Ease off gradually at the end.'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, muscle_group = EXCLUDED.muscle_group, sets = EXCLUDED.sets,
  reps = EXCLUDED.reps, difficulty = EXCLUDED.difficulty, rest_seconds = EXCLUDED.rest_seconds,
  description = EXCLUDED.description, equipment = EXCLUDED.equipment, instructions = EXCLUDED.instructions;

INSERT INTO food_items (id, name, calories, protein, carbohydrates, fat, serving_description)
VALUES
('oats-banana', 'Oatmeal with banana', 320, 10, 58, 6, '1 bowl'),
('whey-shake', 'Whey protein shake', 160, 25, 6, 3, '1 serving'),
('chicken-150', 'Grilled chicken breast', 250, 46, 0, 5, '150 g'),
('rice-cup', 'Cooked basmati rice', 205, 4, 45, 0, '1 cup'),
('greek-yogurt', 'Plain Greek yogurt', 130, 23, 9, 0, '170 g'),
('egg-two', 'Boiled eggs', 156, 13, 1, 11, '2 large eggs'),
('apple', 'Apple', 95, 0, 25, 0, '1 medium')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, calories = EXCLUDED.calories, protein = EXCLUDED.protein,
  carbohydrates = EXCLUDED.carbohydrates, fat = EXCLUDED.fat,
  serving_description = EXCLUDED.serving_description;

INSERT INTO achievement_catalog (id, title, description, criterion, threshold)
VALUES
('workouts-1', 'First Workout', 'Complete your first recorded workout.', 'workouts', 1),
('workouts-5', 'Five Workouts', 'Complete five recorded workouts.', 'workouts', 5),
('workouts-10', 'Ten Workouts', 'Complete ten recorded workouts.', 'workouts', 10),
('workouts-25', 'Twenty-Five Workouts', 'Complete twenty-five recorded workouts.', 'workouts', 25),
('workouts-50', 'Fifty Workouts', 'Complete fifty recorded workouts.', 'workouts', 50),
('minutes-1000', 'One Thousand Minutes', 'Log one thousand active workout minutes.', 'minutes', 1000),
('class-first', 'First Class Booking', 'Book your first upcoming gym class.', 'bookings', 1),
('record-first', 'First Personal Record', 'Record a genuine performance milestone.', 'records', 1)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description,
  criterion = EXCLUDED.criterion, threshold = EXCLUDED.threshold;

INSERT INTO classes (title, coach_name, start_time, duration_minutes, capacity, intensity, description)
SELECT v.title, v.coach_name,
       date_trunc('week', now()) + (v.day_offset || ' days')::interval + (v.start_hour || ' hours')::interval,
       v.duration_minutes, v.capacity, v.intensity, v.description
FROM (VALUES
  ('HIIT', 'Layla Haddad', 0, 18, 45, 20, 'Hard', 'Coach-led high-intensity intervals with scalable options.'),
  ('Yoga', 'Sofia Marin', 1, 7, 60, 22, 'Easy', 'A steady flow focused on breath, balance and mobility.'),
  ('Spin', 'Priya Menon', 2, 18, 45, 24, 'Medium', 'Energizing indoor cycling with adjustable resistance.'),
  ('Boxing', 'Karim Nasser', 3, 19, 50, 18, 'Hard', 'Technique-led boxing combinations and conditioning.'),
  ('Strength Training', 'Marcus Reyes', 4, 18, 60, 16, 'Hard', 'Foundational strength work with coach-led progressions.'),
  ('Functional Fitness', 'Priya Menon', 5, 9, 50, 18, 'Medium', 'Practical full-body movement and conditioning.'),
  ('Mobility', 'Sofia Marin', 6, 10, 40, 20, 'Easy', 'Guided joint mobility and movement preparation.'),
  ('Core Conditioning', 'Daniel Okafor', 1, 18, 35, 18, 'Medium', 'Progressive trunk stability and core strength.'),
  ('Circuit Training', 'Layla Haddad', 3, 7, 45, 20, 'Hard', 'A coached circuit mixing strength and cardio stations.'),
  ('Recovery Stretch', 'Sofia Marin', 5, 11, 40, 20, 'Easy', 'A restorative full-body stretch and breathing session.')
) AS v(title, coach_name, day_offset, start_hour, duration_minutes, capacity, intensity, description)
ON CONFLICT (title, start_time) DO NOTHING;

INSERT INTO membership_plans (id, name, description, price, billing_period, features, active)
VALUES
  ('starter', 'Starter', 'Illustrative pricing only; not an official FORGE. offer.', 199, 'monthly', ARRAY['Gym access', 'Standard equipment', 'Basic workout tracking'], true),
  ('performance', 'Performance', 'Illustrative pricing only; not an official FORGE. offer.', 349, 'monthly', ARRAY['Full gym access', 'Group fitness classes', 'Workout planning'], true),
  ('elite', 'Elite', 'Illustrative pricing only; not an official FORGE. offer.', 599, 'monthly', ARRAY['Premium facilities', 'Group classes', 'Training consultation'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
  billing_period = EXCLUDED.billing_period, features = EXCLUDED.features, active = EXCLUDED.active;
