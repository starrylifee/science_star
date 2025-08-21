export function initChapter9() {
    if (!window.__ch9_quiz_app) {
        window.__ch9_quiz_app = new Quiz('quiz-form');
    }
}

class Quiz {
    constructor(formId) {
        this.form = document.getElementById(formId);
        if(!this.form) return;
        
        this.answers = {
            q1: "둥근",
            q2: "충돌 구덩이",
            q3: "해왕성",
            q4: "기체",
            q5: "태양",
            'q6-1': "북두칠성",
            'q6-2': "작은곰자리",
            'q6-3': "카시오페이아",
            'q7-1': "상현달",
            'q7-2': "하현달",
            q8: "30"
        };
        
        this.modal = document.getElementById('quiz-modal');
        this.modalTitle = document.getElementById('quiz-result-title');
        this.modalFeedback = document.getElementById('quiz-feedback');
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('quiz-close-btn')?.addEventListener('click', () => this.closeModal());
        
        this.form.querySelectorAll('.hint-btn').forEach(btn => {
            btn.addEventListener('mousedown', (e) => this.showHint(e));
            btn.addEventListener('mouseup', (e) => this.hideHint(e));
            btn.addEventListener('mouseleave', (e) => this.hideHint(e));
            btn.addEventListener('touchstart', (e) => this.showHint(e));
            btn.addEventListener('touchend', (e) => this.hideHint(e));
        });
    }
    
    showHint(e) {
        const p = e.target.previousElementSibling;
        const inputs = p.querySelectorAll('input');
        const hints = e.target.dataset.hint.split(', ');
        inputs.forEach((input, index) => {
            if (hints[index]) {
                input.placeholder = hints[index];
            } else {
                input.placeholder = e.target.dataset.hint; // Fallback for single hints
            }
        });
    }
    
    hideHint(e) {
        const p = e.target.previousElementSibling;
        const inputs = p.querySelectorAll('input');
        inputs.forEach(input => {
            input.placeholder = '';
        });
    }

    handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.form);
        let correctCount = 0;
        let feedbackHTML = '';
        
        this.form.querySelectorAll('input[type="text"]').forEach(input => {
            input.classList.remove('incorrect-answer');
        });

        for (const [name, answer] of Object.entries(this.answers)) {
            const userAnswer = formData.get(name)?.trim();
            const input = this.form.elements[name];

            if (userAnswer === answer) {
                correctCount++;
            } else {
                if(input) input.classList.add('incorrect-answer');
                feedbackHTML += `<p>❌ ${input.closest('div').textContent.split('(')[0].trim()} - 정답: <strong>${answer}</strong></p>`;
            }
        }
        
        if (correctCount === Object.keys(this.answers).length) {
            this.modalTitle.textContent = '🎉 축하합니다! 모두 맞혔어요! 🎉';
            this.modalFeedback.innerHTML = '<p class="text-center text-green-400">당신은 진정한 우주 탐험대원입니다!</p>';
        } else {
            this.modalTitle.textContent = `🤔 다시 한번 풀어볼까요? (${correctCount} / ${Object.keys(this.answers).length} 정답)`;
            this.modalFeedback.innerHTML = feedbackHTML;
        }
        
        this.openModal();
    }
    
    openModal() {
        this.modal?.classList.remove('hidden');
    }
    
    closeModal() {
        this.modal?.classList.add('hidden');
    }
}
