// ===== دیتابیس localStorage =====

// دریافت اطلاعات از localStorage
function getData() {
    const defaultData = {
        users: {},
        exercises: [],
        workoutPlans: [],
        currentUser: null
    };
    
    const saved = localStorage.getItem('gymData');
    if (saved) {
        return JSON.parse(saved);
    }
    return defaultData;
}

// ذخیره اطلاعات در localStorage
function saveData(data) {
    localStorage.setItem('gymData', JSON.stringify(data));
}

// ===== توابع کاربر =====

// دریافت یا ساخت کاربر
function getOrCreateUser(userId) {
    const data = getData();
    if (!data.users[userId]) {
        data.users[userId] = {
            id: userId,
            gender: null,
            name: 'کاربر'
        };
        saveData(data);
    }
    return data.users[userId];
}

// تنظیم جنسیت کاربر
function setUserGender(userId, gender) {
    const data = getData();
    if (data.users[userId]) {
        data.users[userId].gender = gender;
        saveData(data);
    }
}

// ===== توابع تمرینات =====

// اضافه کردن تمرین
function addExerciseToDB(name, description, videoUrl, gender) {
    const data = getData();
    const newExercise = {
        id: Date.now(),
        name: name,
        description: description || null,
        videoUrl: videoUrl || null,
        gender: gender
    };
    data.exercises.push(newExercise);
    saveData(data);
    return newExercise;
}

// دریافت تمرینات
function getExercises(gender = null) {
    const data = getData();
    if (gender) {
        return data.exercises.filter(e => e.gender === gender || e.gender === 'both');
    }
    return data.exercises;
}

// حذف تمرین
function deleteExercise(id) {
    const data = getData();
    data.exercises = data.exercises.filter(e => e.id !== id);
    saveData(data);
}

// ===== توابع برنامه تمرینی =====

// اضافه کردن برنامه
function addWorkoutPlanToDB(day, exerciseId, gender) {
    const data = getData();
    
    // بررسی تکراری نبودن
    const exists = data.workoutPlans.some(p => 
        p.day === day && p.exerciseId === exerciseId && p.gender === gender
    );
    
    if (exists) {
        return false;
    }
    
    // پیدا کردن بیشترین order
    const existing = data.workoutPlans.filter(p => p.day === day && p.gender === gender);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(p => p.order)) : 0;
    
    const newPlan = {
        id: Date.now(),
        day: day,
        exerciseId: exerciseId,
        gender: gender,
        order: maxOrder + 1
    };
    
    data.workoutPlans.push(newPlan);
    saveData(data);
    return true;
}

// دریافت برنامه تمرینی
function getWorkoutPlan(day, gender) {
    const data = getData();
    return data.workoutPlans
        .filter(p => p.day === day && p.gender === gender)
        .sort((a, b) => a.order - b.order)
        .map(p => {
            const exercise = data.exercises.find(e => e.id === p.exerciseId);
            return {
                ...p,
                exercise: exercise
            };
        });
}

// دریافت روزهای تمرینی
function getWorkoutDays(gender) {
    const data = getData();
    const days = [...new Set(
        data.workoutPlans
            .filter(p => p.gender === gender)
            .map(p => p.day)
    )];
    return days.sort((a, b) => a - b);
}

// ===== توابع رابط کاربری =====

// نمایش صفحه
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // بروزرسانی صفحه
    if (pageId === 'home-page') {
        updateHomePage();
    } else if (pageId === 'admin-page') {
        updateAdminPage();
    }
}

// بروزرسانی صفحه اصلی
function updateHomePage() {
    const userId = getUserId();
    const user = getOrCreateUser(userId);
    
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-gender').textContent = 
        user.gender === 'female' ? '👩 بانوان' : 
        user.gender === 'male' ? '👨 آقایان' : 'انتخاب نشده';
    
    if (user.gender) {
        document.getElementById('gender-select').style.display = 'none';
        document.getElementById('workout-days').style.display = 'block';
        
        const days = getWorkoutDays(user.gender);
        const container = document.getElementById('days-container');
        
        if (days.length === 0) {
            container.innerHTML = '<div class="empty-msg">هنوز برنامه‌ای تعیین نشده</div>';
        } else {
            container.innerHTML = days.map(day => 
                `<button class="day-btn" onclick="showWorkout(${day})">
                    📅 روز ${day}
                </button>`
            ).join('');
        }
    } else {
        document.getElementById('gender-select').style.display = 'block';
        document.getElementById('workout-days').style.display = 'none';
    }
}

// انتخاب جنسیت
function selectGender(gender) {
    const userId = getUserId();
    setUserGender(userId, gender);
    updateHomePage();
}

// نمایش تمرینات روز
function showWorkout(day) {
    const userId = getUserId();
    const user = getOrCreateUser(userId);
    const plan = getWorkoutPlan(day, user.gender);
    
    document.getElementById('workout-title').textContent = `📅 تمرینات روز ${day}`;
    
    const container = document.getElementById('exercises-container');
    
    if (plan.length === 0) {
        container.innerHTML = '<div class="empty-msg">تمرینی تعریف نشده</div>';
    } else {
        container.innerHTML = plan.map((p, i) => {
            const ex = p.exercise;
            if (!ex) return '';
            
            let html = `
                <div class="exercise-card">
                    <h3>${i + 1}. ${ex.name}</h3>
            `;
            
            if (ex.description) {
                html += `<p>📝 ${ex.description}</p>`;
            }
            
            if (ex.videoUrl) {
                html += `<p><a href="${ex.videoUrl}" target="_blank">🎥 فیلم آموزشی</a></p>`;
            }
            
            html += '</div>';
            return html;
        }).join('');
    }
    
    showPage('workout-page');
}

// ===== توابع ادمین =====

// بروزرسانی صفحه ادمین
function updateAdminPage() {
    // لیست تمرینات
    const exercises = getExercises();
    const listContainer = document.getElementById('exercises-list');
    
    if (exercises.length === 0) {
        listContainer.innerHTML = '<div class="empty-msg">تمرینی وجود نداره</div>';
    } else {
        listContainer.innerHTML = exercises.map(ex => {
            const genderText = ex.gender === 'female' ? '👩 بانوان' : 
                              ex.gender === 'male' ? '👨 آقایان' : '👥 هر دو';
            return `
                <div class="exercise-item">
                    <span>${ex.name} (${genderText})</span>
                    <button onclick="deleteExerciseItem(${ex.id})">🗑️</button>
                </div>
            `;
        }).join('');
    }
    
    // لیست کشویی تمرینات
    const select = document.getElementById('workout-exercise');
    select.innerHTML = exercises.map(ex => 
        `<option value="${ex.id}">${ex.name}</option>`
    ).join('');
    
    // برنامه کامل
    updateFullPlan();
}

// اضافه کردن تمرین
function addExercise() {
    const name = document.getElementById('exercise-name').value.trim();
    const desc = document.getElementById('exercise-desc').value.trim();
    const video = document.getElementById('exercise-video').value.trim();
    const gender = document.getElementById('exercise-gender').value;
    
    if (!name) {
        alert('لطفاً نام تمرین رو وارد کنید!');
        return;
    }
    
    addExerciseToDB(name, desc, video, gender);
    
    // پاکسازی فیلدها
    document.getElementById('exercise-name').value = '';
    document.getElementById('exercise-desc').value = '';
    document.getElementById('exercise-video').value = '';
    
    updateAdminPage();
    alert('✅ تمرین اضافه شد!');
}

// حذف تمرین
function deleteExerciseItem(id) {
    if (confirm('آیا مطمئنید؟')) {
        deleteExercise(id);
        updateAdminPage();
    }
}

// اضافه کردن برنامه
function addWorkoutPlan() {
    const day = parseInt(document.getElementById('workout-day').value);
    const exerciseId = parseInt(document.getElementById('workout-exercise').value);
    
    if (!day || day < 1) {
        alert('لطفاً شماره روز رو وارد کنید!');
        return;
    }
    
    const exercise = getExercises().find(e => e.id === exerciseId);
    if (!exercise) {
        alert('تمرین پیدا نشد!');
        return;
    }
    
    const result = addWorkoutPlanToDB(day, exerciseId, exercise.gender);
    
    if (result) {
        document.getElementById('workout-day').value = '';
        updateAdminPage();
        alert('✅ به برنامه اضافه شد!');
    } else {
        alert('⚠️ این تمرین قبلاً در این روز اضافه شده!');
    }
}

// نمایش برنامه کامل
function updateFullPlan() {
    const data = getData();
    const container = document.getElementById('full-plan');
    
    if (data.workoutPlans.length === 0) {
        container.innerHTML = '<div class="empty-msg">برنامه‌ای تنظیم نشده</div>';
        return;
    }
    
    // گروه‌بندی بر اساس جنسیت و روز
    const grouped = {};
    data.workoutPlans.forEach(p => {
        if (!grouped[p.gender]) grouped[p.gender] = {};
        if (!grouped[p.gender][p.day]) grouped[p.gender][p.day] = [];
        grouped[p.gender][p.day].push(p);
    });
    
    let html = '';
    
    for (const [gender, days] of Object.entries(grouped)) {
        const genderText = gender === 'female' ? '👩 بانوان' : '👨 آقایان';
        html += `<div class="plan-day"><h4>${genderText}</h4>`;
        
        for (const [day, plans] of Object.entries(days).sort((a, b) => a[0] - b[0])) {
            html += `<p><strong>📅 روز ${day}:</strong></p>`;
            plans.sort((a, b) => a.order - b.order).forEach(p => {
                const ex = data.exercises.find(e => e.id === p.exerciseId);
                if (ex) {
                    html += `<div class="plan-exercise">${ex.name}</div>`;
                }
            });
        }
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// ===== توابع کمکی =====

// دریافت آیدی کاربر (از تلگرام یا پیش‌فرض)
function getUserId() {
    // اگه داخل تلگرام باشیم
    if (window.Telegram && window.Telegram.WebApp) {
        return window.Telegram.WebApp.initDataUnsafe?.user?.id || 'default_user';
    }
    return 'default_user';
}

// ===== راه‌اندازی =====

document.addEventListener('DOMContentLoaded', function() {
    // بروزرسانی صفحه اصلی
    updateHomePage();
    
    // اتصال به تلگرام (اگه داخل مینی‌اپ باشیم)
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }
});
