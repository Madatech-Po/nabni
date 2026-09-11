document.addEventListener('DOMContentLoaded', () => {
    // 1. Dark Mode Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    
    // Check local storage or system preference
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        if(themeToggleIcon) {
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    } else {
        document.documentElement.classList.remove('dark');
    }

    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
                themeToggleIcon.classList.remove('fa-sun');
                themeToggleIcon.classList.add('fa-moon');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
                themeToggleIcon.classList.remove('fa-moon');
                themeToggleIcon.classList.add('fa-sun');
            }
        });
    }

    // 2. Mobile Menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu');

    if(mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('hidden');
            // Small delay to allow display:block to apply before animation
            setTimeout(() => {
                mobileMenu.firstElementChild.style.transform = 'translateX(0)';
                mobileMenu.lastElementChild.classList.remove('opacity-0');
            }, 10);
        });

        const closeMenu = () => {
            mobileMenu.firstElementChild.style.transform = 'translateX(100%)';
            mobileMenu.lastElementChild.classList.add('opacity-0');
            setTimeout(() => {
                mobileMenu.classList.add('hidden');
            }, 300);
        };

        if(closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', closeMenu);
        mobileMenu.lastElementChild.addEventListener('click', closeMenu); // backdrop click
    }

    // 3. Custom Select Dropdowns
    const setupDropdown = (containerId, inputId, options) => {
        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        if(!container || !input) return;
        
        const dropdown = container.querySelector('.custom-dropdown');
        const list = dropdown.querySelector('ul');

        // Populate options
        options.forEach(opt => {
            const li = document.createElement('li');
            li.className = 'px-4 py-2 hover:bg-green-50 dark:hover:bg-gray-700 cursor-pointer text-sm font-medium transition-colors text-gray-700 dark:text-gray-300';
            li.textContent = opt;
            li.addEventListener('click', () => {
                input.value = opt;
                dropdown.classList.add('hidden');
            });
            list.appendChild(li);
        });

        // Toggle dropdown
        container.addEventListener('click', (e) => {
            // Close other dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if(d !== dropdown) d.classList.add('hidden');
            });
            dropdown.classList.toggle('hidden');
            e.stopPropagation();
        });
    };

    const govOptions = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'أسيوط', 'الإسماعيلية'];
    const subOptions = ['لغة عربية', 'رياضيات', 'لغة إنجليزية', 'علوم', 'دراسات اجتماعية', 'تأسيس عام'];
    const typeOptions = ['أونلاين', 'في المنزل', 'في سنتر تعليمي'];

    setupDropdown('gov-container', 'gov-input', govOptions);
    setupDropdown('sub-container', 'sub-input', subOptions);
    setupDropdown('type-container', 'type-input', typeOptions);

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.add('hidden'));
    });

    // 4. Modals (Auth & Profile)
    const setupModal = (triggerSelectors, modalId) => {
        const modal = document.getElementById(modalId);
        const triggers = document.querySelectorAll(triggerSelectors);
        if(!modal || triggers.length === 0) return;
        
        const closeBtns = modal.querySelectorAll('.close-modal');

        const openModal = (e) => {
            e?.preventDefault();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
            // Animate in
            modal.firstElementChild.classList.add('animate-slide-up');
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            modal.firstElementChild.classList.remove('animate-slide-up');
        };

        triggers.forEach(t => t.addEventListener('click', openModal));
        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    };

    setupModal('.trigger-login', 'login-modal');
    setupModal('.trigger-signup', 'signup-modal');
    setupModal('.trigger-profile', 'profile-modal');

    // 5. Form Submissions (Newsletter)
    const newsletterForm = document.getElementById('newsletter-form');
    const toast = document.getElementById('toast');

    if(newsletterForm && toast) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = newsletterForm.querySelector('input[type="email"]');
            if(input.value) {
                // Show toast
                toast.classList.remove('translate-y-full', 'opacity-0');
                input.value = ''; // clear
                setTimeout(() => {
                    toast.classList.add('translate-y-full', 'opacity-0');
                }, 4000);
            }
        });
    }

    // 6. Advanced Setup Dropdown (Searchable)
    const setupSearchableDropdown = (containerId, inputId, listId, searchId, options) => {
        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        const searchInput = searchId ? document.getElementById(searchId) : null;
        if(!container || !input || !list) return;

        const dropdown = container.querySelector('.custom-dropdown');

        const renderOptions = (filterText = '') => {
            list.innerHTML = '';
            const filtered = options.filter(opt => opt.includes(filterText));
            if(filtered.length === 0) {
                list.innerHTML = '<li class="px-4 py-2 text-sm text-gray-500 text-center">لا توجد نتائج</li>';
                return;
            }
            filtered.forEach(opt => {
                const li = document.createElement('li');
                li.className = 'px-4 py-2.5 hover:bg-primary/5 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium transition-colors text-gray-700 dark:text-gray-300';
                li.textContent = opt;
                li.addEventListener('click', (e) => {
                    input.value = opt;
                    input.dispatchEvent(new Event('input')); // Trigger validation clear
                    closeDropdown();
                    e.stopPropagation();
                });
                list.appendChild(li);
            });
        };

        const openDropdown = () => {
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if(d !== dropdown && !d.classList.contains('hidden')) {
                    d.classList.add('opacity-0', 'scale-95');
                    setTimeout(() => d.classList.add('hidden'), 200);
                }
            });
            dropdown.classList.remove('hidden');
            // Small delay to allow display block to apply before animating opacity
            setTimeout(() => dropdown.classList.remove('opacity-0', 'scale-95'), 10);
            if(searchInput) searchInput.focus();
        };

        const closeDropdown = () => {
            dropdown.classList.add('opacity-0', 'scale-95');
            setTimeout(() => dropdown.classList.add('hidden'), 200);
        };

        input.parentElement.addEventListener('click', (e) => {
            if(dropdown.classList.contains('hidden')) {
                renderOptions('');
                if(searchInput) searchInput.value = '';
                openDropdown();
            } else {
                closeDropdown();
            }
            e.stopPropagation();
        });

        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderOptions(e.target.value);
            });
            searchInput.addEventListener('click', e => e.stopPropagation());
            searchInput.addEventListener('keydown', e => {
                if(e.key === 'Enter') e.preventDefault();
            });
        }
    };

    const egyptGovernorates = [
        'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 
        'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 
        'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء', 
        'شمال سيناء', 'كفر الشيخ', 'الأقصر', 'مطروح'
    ];
    const educationStages = ['رياض الأطفال (KG)', 'ابتدائي (Primary)', 'إعدادي (Preparatory)'];

    setupSearchableDropdown('reg-gov-container', 'reg-gov-input', 'reg-gov-list', 'reg-gov-search', egyptGovernorates);
    setupSearchableDropdown('reg-stage-container', 'reg-stage-input', 'reg-stage-list', null, educationStages);

    const tutorSubjects = ['لغة عربية', 'رياضيات', 'لغة إنجليزية', 'علوم', 'دراسات اجتماعية', 'تأسيس عام'];
    setupSearchableDropdown('tutor-gov-container', 'tutor-gov-input', 'tutor-gov-list', 'tutor-gov-search', egyptGovernorates);
    setupSearchableDropdown('tutor-sub-container', 'tutor-sub-input', 'tutor-sub-list', null, tutorSubjects);

    // 7. Multi-step Signup Modal & Validation
    const nextStepBtn = document.getElementById('next-step-btn');
    const prevStepParentBtn = document.getElementById('prev-step-btn');
    const prevStepTutorBtn = document.getElementById('prev-step-tutor-btn');
    const nextStepTutorSpecsBtn = document.getElementById('next-step-tutor-specs-btn');
    const prevStepTutorSpecsBtn = document.getElementById('prev-step-tutor-specs-btn');
    const step1 = document.getElementById('signup-step-1');
    const stepParent = document.getElementById('signup-step-parent');
    const stepTutor = document.getElementById('signup-step-tutor');
    const stepTutorSpecs = document.getElementById('signup-step-tutor-specs');
    const accParentRadio = document.getElementById('acc-parent');
    const signupForm = document.getElementById('signup-form');

    const allTutorSteps = [step1, stepParent, stepTutor, stepTutorSpecs].filter(Boolean);

    const hideAllSteps = () => {
        allTutorSteps.forEach(s => s.classList.add('hidden'));
    };

    const validateContainer = (container) => {
        let isValid = true;
        let fieldsToValidate = [];
        
        if(container.id === 'signup-step-1') {
            fieldsToValidate = ['firstname', 'lastname', 'phone', 'email', 'password'];
        } else if(container.id === 'signup-step-parent') {
            fieldsToValidate = ['governorate', 'region', 'educational_stage'];
        } else if(container.id === 'signup-step-tutor') {
            fieldsToValidate = ['tutor_governorate', 'tutor_region', 'tutor_subject', 'tutor_experience'];
            
            // Checkbox validation for stages
            const checkboxes = container.querySelectorAll('input[name="tutor_stages"]');
            if(checkboxes.length > 0) {
                const isChecked = Array.from(checkboxes).some(cb => cb.checked);
                const errorMsg = container.querySelector('.group-checkbox .error-msg');
                if(!isChecked) {
                    if(errorMsg) errorMsg.classList.remove('hidden');
                    isValid = false;
                } else {
                    if(errorMsg) errorMsg.classList.add('hidden');
                }
            }
        } else if(container.id === 'signup-step-tutor-specs') {
            // At least one specialization required
            const specCheckboxes = container.querySelectorAll('input[name="tutor_specs"]');
            const isChecked = Array.from(specCheckboxes).some(cb => cb.checked);
            const errorMsg = document.getElementById('tutor-specs-error');
            if(!isChecked) {
                if(errorMsg) errorMsg.classList.remove('hidden');
                isValid = false;
            } else {
                if(errorMsg) errorMsg.classList.add('hidden');
            }
        }

        fieldsToValidate.forEach(name => {
            const input = container.querySelector(`[name="${name}"]`);
            if(!input) return;
            const parentRelative = input.closest('.relative');
            if(!parentRelative) return;
            const errorMsg = parentRelative.parentElement.querySelector('.error-msg') || parentRelative.querySelector('.error-msg');
            
            if(!input.value.trim()) {
                input.classList.add('border-red-400');
                if(errorMsg) errorMsg.classList.remove('hidden');
                isValid = false;
            } else {
                input.classList.remove('border-red-400');
                if(errorMsg) errorMsg.classList.add('hidden');
            }
        });
        
        return isValid;
    };

    if(signupForm) {
        // Clear validation on input
        signupForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('border-red-400');
                const parentRelative = this.closest('.relative');
                if(parentRelative) {
                    const errorMsg = parentRelative.parentElement.querySelector('.error-msg') || parentRelative.querySelector('.error-msg');
                    if(errorMsg) errorMsg.classList.add('hidden');
                }
                if(this.type === 'checkbox') {
                    const group = this.closest('.group-checkbox');
                    if(group) {
                        const errorMsg = group.querySelector('.error-msg');
                        if(errorMsg) errorMsg.classList.add('hidden');
                    }
                    // Also clear specs error
                    const specsError = document.getElementById('tutor-specs-error');
                    if(specsError) specsError.classList.add('hidden');
                }
            });
        });

        // Override form submission (from parent step or tutor-specs step)
        signupForm.onsubmit = (e) => {
            e.preventDefault();
            let activeStep = null;
            if(stepParent && !stepParent.classList.contains('hidden')) activeStep = stepParent;
            else if(stepTutorSpecs && !stepTutorSpecs.classList.contains('hidden')) activeStep = stepTutorSpecs;

            if(activeStep && validateContainer(activeStep)) {
                alert('تم إنشاء الحساب بنجاح!');
                document.getElementById('signup-modal').querySelector('.close-modal').click();
                
                // Reset form to step 1 upon successful close
                setTimeout(() => {
                    hideAllSteps();
                    step1.classList.remove('hidden');
                    signupForm.reset();
                }, 300);
            }
        };
    }

    // Step 1 → Parent or Tutor
    if(nextStepBtn && step1) {
        nextStepBtn.addEventListener('click', () => {
            if(validateContainer(step1)) {
                hideAllSteps();
                if(accParentRadio && accParentRadio.checked) {
                    stepParent.classList.remove('hidden');
                } else {
                    stepTutor.classList.remove('hidden');
                }
            }
        });
    }

    // Tutor Info → Tutor Specializations
    if(nextStepTutorSpecsBtn && stepTutor && stepTutorSpecs) {
        nextStepTutorSpecsBtn.addEventListener('click', () => {
            if(validateContainer(stepTutor)) {
                hideAllSteps();
                stepTutorSpecs.classList.remove('hidden');
            }
        });
    }

    // Back buttons
    if(prevStepParentBtn) prevStepParentBtn.addEventListener('click', () => { hideAllSteps(); step1.classList.remove('hidden'); });
    if(prevStepTutorBtn) prevStepTutorBtn.addEventListener('click', () => { hideAllSteps(); step1.classList.remove('hidden'); });
    if(prevStepTutorSpecsBtn) prevStepTutorSpecsBtn.addEventListener('click', () => { hideAllSteps(); stepTutor.classList.remove('hidden'); });

    // Handle interest buttons
    document.querySelectorAll('.interest-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('border-primary');
            this.classList.toggle('text-primary');
            this.classList.toggle('bg-primary/5');
            this.classList.toggle('text-gray-600');
            this.classList.toggle('dark:text-gray-300');
        });
    });
});
