/**
 * 🎯 MOSA FORGE: Enterprise Learning Context
 * 
 * @module LearningContext
 * @description Global state management for learning progress, phase tracking, and real-time updates
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time progress tracking across all phases
 * - Duolingo-style exercise management
 * - Mindset phase monitoring
 * - Quality metrics integration
 * - Multi-course progress synchronization
 * - Offline capability with sync
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
    Alert, 
    AppState, 
    Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// 🏗️ Enterprise Constants
const LEARNING_PHASES = {
    MINDSET: 'MINDSET',
    THEORY: 'THEORY', 
    HANDS_ON: 'HANDS_ON',
    CERTIFICATION: 'CERTIFICATION',
    COMPLETED: 'COMPLETED'
};

const EXERCISE_TYPES = {
    DUOLINGO_INTERACTIVE: 'DUOLINGO_INTERACTIVE',
    DECISION_SCENARIO: 'DECISION_SCENARIO',
    REAL_TIME_CHART: 'REAL_TIME_CHART',
    PRACTICAL_ASSIGNMENT: 'PRACTICAL_ASSIGNMENT',
    MINDSET_REFLECTION: 'MINDSET_REFLECTION',
    FINAL_ASSESSMENT: 'FINAL_ASSESSMENT'
};

const PROGRESS_STATES = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    LOCKED: 'LOCKED'
};

const SYNC_STATUS = {
    SYNCED: 'SYNCED',
    PENDING: 'PENDING',
    SYNCING: 'SYNCING',
    FAILED: 'FAILED'
};

// 🏗️ Initial State Structure
const initialState = {
    // 🎯 Current Learning Session
    currentEnrollment: null,
    activeSkill: null,
    currentPhase: LEARNING_PHASES.MINDSET,
    currentExercise: null,
    
    // 📊 Progress Tracking
    progress: {
        [LEARNING_PHASES.MINDSET]: {
            completed: 0,
            total: 20,
            percentage: 0,
            status: PROGRESS_STATES.IN_PROGRESS,
            lastUpdated: null
        },
        [LEARNING_PHASES.THEORY]: {
            completed: 0,
            total: 100,
            percentage: 0,
            status: PROGRESS_STATES.LOCKED,
            lastUpdated: null
        },
        [LEARNING_PHASES.HANDS_ON]: {
            completed: 0,
            total: 50,
            percentage: 0,
            status: PROGRESS_STATES.LOCKED,
            lastUpdated: null
        },
        [LEARNING_PHASES.CERTIFICATION]: {
            completed: 0,
            total: 10,
            percentage: 0,
            status: PROGRESS_STATES.LOCKED,
            lastUpdated: null
        }
    },
    
    // 💡 Mindset Phase Specific
    mindset: {
        currentWeek: 1,
        weeks: {
            1: {
                topic: 'Wealth Consciousness',
                exercises: [],
                completed: 0,
                total: 5,
                status: PROGRESS_STATES.IN_PROGRESS
            },
            2: {
                topic: 'Discipline Building',
                exercises: [],
                completed: 0, 
                total: 5,
                status: PROGRESS_STATES.LOCKED
            },
            3: {
                topic: 'Action Taking',
                exercises: [],
                completed: 0,
                total: 5,
                status: PROGRESS_STATES.LOCKED
            },
            4: {
                topic: 'Financial Psychology', 
                exercises: [],
                completed: 0,
                total: 5,
                status: PROGRESS_STATES.LOCKED
            }
        },
        assessment: {
            completed: false,
            score: null,
            insights: []
        }
    },
    
    // 🎮 Exercise Management
    exercises: {
        current: null,
        history: [],
        streak: 0,
        dailyGoal: 5,
        completedToday: 0,
        lastCompleted: null
    },
    
    // 📈 Performance Metrics
    performance: {
        averageScore: 0,
        completionRate: 0,
        timeSpent: 0,
        consistencyScore: 0,
        weakAreas: []
    },
    
    // 🔄 Sync & Connectivity
    sync: {
        status: SYNC_STATUS.SYNCED,
        lastSync: new Date().toISOString(),
        pendingChanges: 0,
        offlineQueue: []
    },
    
    // ⚙️ System State
    system: {
        isOnline: true,
        isLoading: false,
        lastError: null,
        lastUpdated: new Date().toISOString()
    }
};

// 🏗️ Action Types
const LEARNING_ACTIONS = {
    // 🎯 Enrollment Actions
    SET_ENROLLMENT: 'SET_ENROLLMENT',
    UPDATE_PHASE: 'UPDATE_PHASE',
    
    // 📊 Progress Actions
    UPDATE_PROGRESS: 'UPDATE_PROGRESS',
    COMPLETE_EXERCISE: 'COMPLETE_EXERCISE',
    UNLOCK_PHASE: 'UNLOCK_PHASE',
    
    // 💡 Mindset Actions
    UPDATE_MINDSET_WEEK: 'UPDATE_MINDSET_WEEK',
    COMPLETE_MINDSET_EXERCISE: 'COMPLETE_MINDSET_EXERCISE',
    SUBMIT_ASSESSMENT: 'SUBMIT_ASSESSMENT',
    
    // 🎮 Exercise Actions
    START_EXERCISE: 'START_EXERCISE',
    SUBMIT_ANSWER: 'SUBMIT_ANSWER',
    UPDATE_STREAK: 'UPDATE_STREAK',
    
    // 🔄 Sync Actions
    SET_SYNC_STATUS: 'SET_SYNC_STATUS',
    QUEUE_OFFLINE_ACTION: 'QUEUE_OFFLINE_ACTION',
    PROCESS_OFFLINE_QUEUE: 'PROCESS_OFFLINE_QUEUE',
    
    // ⚙️ System Actions
    SET_LOADING: 'SET_LOADING',
    SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    
    // 💾 Persistence Actions
    HYDRATE_STATE: 'HYDRATE_STATE',
    SAVE_STATE: 'SAVE_STATE'
};

/**
 * 🏗️ Enterprise Learning Reducer
 */
const learningReducer = (state, action) => {
    const { type, payload } = action;
    const timestamp = new Date().toISOString();

    try {
        switch (type) {
            // 🎯 Enrollment Management
            case LEARNING_ACTIONS.SET_ENROLLMENT:
                return {
                    ...state,
                    currentEnrollment: payload.enrollment,
                    activeSkill: payload.skill,
                    currentPhase: payload.currentPhase || LEARNING_PHASES.MINDSET,
                    system: {
                        ...state.system,
                        lastUpdated: timestamp
                    }
                };

            case LEARNING_ACTIONS.UPDATE_PHASE:
                return {
                    ...state,
                    currentPhase: payload.phase,
                    system: {
                        ...state.system,
                        lastUpdated: timestamp
                    }
                };

            // 📊 Progress Management
            case LEARNING_ACTIONS.UPDATE_PROGRESS:
                const { phase, completed, total } = payload;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                const status = completed === total ? PROGRESS_STATES.COMPLETED : 
                              completed > 0 ? PROGRESS_STATES.IN_PROGRESS : PROGRESS_STATES.NOT_STARTED;

                return {
                    ...state,
                    progress: {
                        ...state.progress,
                        [phase]: {
                            ...state.progress[phase],
                            completed,
                            total,
                            percentage,
                            status,
                            lastUpdated: timestamp
                        }
                    },
                    system: {
                        ...state.system,
                        lastUpdated: timestamp
                    }
                };

            case LEARNING_ACTIONS.COMPLETE_EXERCISE:
                const exercise = payload.exercise;
                const exercisePhase = exercise.phase || state.currentPhase;
                
                // Update phase progress
                const phaseProgress = state.progress[exercisePhase];
                const newCompleted = phaseProgress.completed + 1;
                const newPercentage = phaseProgress.total > 0 ? 
                    Math.round((newCompleted / phaseProgress.total) * 100) : 0;
                const newStatus = newCompleted === phaseProgress.total ? 
                    PROGRESS_STATES.COMPLETED : PROGRESS_STATES.IN_PROGRESS;

                // Update streak and daily progress
                const today = new Date().toDateString();
                const lastCompletedDate = state.exercises.lastCompleted ? 
                    new Date(state.exercises.lastCompleted).toDateString() : null;
                const newStreak = today === lastCompletedDate ? state.exercises.streak : state.exercises.streak + 1;
                const newCompletedToday = today === lastCompletedDate ? 
                    state.exercises.completedToday + 1 : 1;

                return {
                    ...state,
                    progress: {
                        ...state.progress,
                        [exercisePhase]: {
                            ...phaseProgress,
                            completed: newCompleted,
                            percentage: newPercentage,
                            status: newStatus,
                            lastUpdated: timestamp
                        }
                    },
                    exercises: {
                        ...state.exercises,
                        current: null,
                        history: [...state.exercises.history, exercise],
                        streak: newStreak,
                        completedToday: newCompletedToday,
                        lastCompleted: timestamp
                    },
                    system: {
                        ...state.system,
                        lastUpdated: timestamp
                    }
                };

            case LEARNING_ACTIONS.UNLOCK_PHASE:
                return {
                    ...state,
                    progress: {
                        ...state.progress,
                        [payload.phase]: {
                            ...state.progress[payload.phase],
                            status: PROGRESS_STATES.IN_PROGRESS
                        }
                    }
                };

            // 💡 Mindset Management
            case LEARNING_ACTIONS.UPDATE_MINDSET_WEEK:
                return {
                    ...state,
                    mindset: {
                        ...state.mindset,
                        currentWeek: payload.week,
                        weeks: {
                            ...state.mindset.weeks,
                            [payload.week]: {
                                ...state.mindset.weeks[payload.week],
                                status: PROGRESS_STATES.IN_PROGRESS
                            }
                        }
                    }
                };

            case LEARNING_ACTIONS.COMPLETE_MINDSET_EXERCISE:
                const { week, exerciseId } = payload;
                const currentWeek = state.mindset.weeks[week];
                
                // Check if exercise already completed
                const exerciseExists = currentWeek.exercises.includes(exerciseId);
                const updatedExercises = exerciseExists ? 
                    currentWeek.exercises : [...currentWeek.exercises, exerciseId];

                return {
                    ...state,
                    mindset: {
                        ...state.mindset,
                        weeks: {
                            ...state.mindset.weeks,
                            [week]: {
                                ...currentWeek,
                                exercises: updatedExercises,
                                completed: updatedExercises.length,
                                status: updatedExercises.length === currentWeek.total ? 
                                    PROGRESS_STATES.COMPLETED : PROGRESS_STATES.IN_PROGRESS
                            }
                        }
                    }
                };

            case LEARNING_ACTIONS.SUBMIT_ASSESSMENT:
                return {
                    ...state,
                    mindset: {
                        ...state.mindset,
                        assessment: {
                            completed: true,
                            score: payload.score,
                            insights: payload.insights || []
                        }
                    }
                };

            // 🎮 Exercise Management
            case LEARNING_ACTIONS.START_EXERCISE:
                return {
                    ...state,
                    exercises: {
                        ...state.exercises,
                        current: payload.exercise
                    }
                };

            case LEARNING_ACTIONS.SUBMIT_ANSWER:
                // This is handled by COMPLETE_EXERCISE for progress tracking
                return state;

            case LEARNING_ACTIONS.UPDATE_STREAK:
                return {
                    ...state,
                    exercises: {
                        ...state.exercises,
                        streak: payload.streak
                    }
                };

            // 🔄 Sync Management
            case LEARNING_ACTIONS.SET_SYNC_STATUS:
                return {
                    ...state,
                    sync: {
                        ...state.sync,
                        status: payload.status,
                        lastSync: payload.lastSync || state.sync.lastSync,
                        pendingChanges: payload.pendingChanges || state.sync.pendingChanges
                    }
                };

            case LEARNING_ACTIONS.QUEUE_OFFLINE_ACTION:
                return {
                    ...state,
                    sync: {
                        ...state.sync,
                        status: SYNC_STATUS.PENDING,
                        pendingChanges: state.sync.pendingChanges + 1,
                        offlineQueue: [...state.sync.offlineQueue, payload.action]
                    }
                };

            case LEARNING_ACTIONS.PROCESS_OFFLINE_QUEUE:
                return {
                    ...state,
                    sync: {
                        ...state.sync,
                        status: SYNC_STATUS.SYNCING,
                        pendingChanges: 0,
                        offlineQueue: []
                    }
                };

            // ⚙️ System Management
            case LEARNING_ACTIONS.SET_LOADING:
                return {
                    ...state,
                    system: {
                        ...state.system,
                        isLoading: payload.isLoading
                    }
                };

            case LEARNING_ACTIONS.SET_ONLINE_STATUS:
                return {
                    ...state,
                    system: {
                        ...state.system,
                        isOnline: payload.isOnline
                    }
                };

            case LEARNING_ACTIONS.SET_ERROR:
                return {
                    ...state,
                    system: {
                        ...state.system,
                        lastError: {
                            message: payload.message,
                            code: payload.code,
                            timestamp,
                            context: payload.context
                        }
                    }
                };

            case LEARNING_ACTIONS.CLEAR_ERROR:
                return {
                    ...state,
                    system: {
                        ...state.system,
                        lastError: null
                    }
                };

            // 💾 Persistence Management
            case LEARNING_ACTIONS.HYDRATE_STATE:
                return {
                    ...state,
                    ...payload.state,
                    system: {
                        ...state.system,
                        lastUpdated: timestamp
                    }
                };

            case LEARNING_ACTIONS.SAVE_STATE:
                // State saving is handled in effects
                return state;

            default:
                console.warn(`Unknown action type: ${type}`);
                return state;
        }
    } catch (error) {
        console.error('Learning Reducer Error:', error);
        return {
            ...state,
            system: {
                ...state.system,
                lastError: {
                    message: error.message,
                    code: 'REDUCER_ERROR',
                    timestamp,
                    context: { action: type }
                }
            }
        };
    }
};

/**
 * 🏗️ Enterprise Learning Context
 */
const LearningContext = createContext();

/**
 * 🏗️ Learning Provider Component
 */
export const LearningProvider = ({ children, apiService }) => {
    const [state, dispatch] = useReducer(learningReducer, initialState);

    // 🏗️ Storage Keys
    const STORAGE_KEYS = {
        LEARNING_STATE: `@MosaForge:learning_state`,
        LAST_SYNC: `@MosaForge:last_sync`,
        OFFLINE_QUEUE: `@MosaForge:offline_queue`
    };

    /**
     * 🎯 Initialize Learning Session
     */
    const initializeLearning = useCallback(async (enrollmentData) => {
        try {
            dispatch({ 
                type: LEARNING_ACTIONS.SET_LOADING, 
                payload: { isLoading: true } 
            });

            // Validate enrollment data
            if (!enrollmentData?.enrollmentId || !enrollmentData?.skillId) {
                throw new Error('Invalid enrollment data');
            }

            // Fetch latest progress from server
            const progressData = await apiService.getLearningProgress(enrollmentData.enrollmentId);
            
            dispatch({
                type: LEARNING_ACTIONS.SET_ENROLLMENT,
                payload: {
                    enrollment: enrollmentData,
                    skill: progressData.skill,
                    currentPhase: progressData.currentPhase
                }
            });

            // Update progress from server data
            Object.keys(progressData.phases).forEach(phase => {
                dispatch({
                    type: LEARNING_ACTIONS.UPDATE_PROGRESS,
                    payload: {
                        phase,
                        completed: progressData.phases[phase].completed,
                        total: progressData.phases[phase].total
                    }
                });
            });

            dispatch({ 
                type: LEARNING_ACTIONS.SET_LOADING, 
                payload: { isLoading: false } 
            });

            return progressData;

        } catch (error) {
            dispatch({
                type: LEARNING_ACTIONS.SET_ERROR,
                payload: {
                    message: 'Failed to initialize learning session',
                    code: 'INITIALIZATION_ERROR',
                    context: { enrollmentData }
                }
            });
            throw error;
        }
    }, [apiService]);

    /**
     * 📊 Complete Exercise with Progress Tracking
     */
    const completeExercise = useCallback(async (exerciseData) => {
        try {
            const { id, type, phase, difficulty, score, answers } = exerciseData;

            if (!id || !type) {
                throw new Error('Invalid exercise data');
            }

            const exerciseRecord = {
                id,
                type,
                phase: phase || state.currentPhase,
                difficulty,
                score: score || 100,
                answers,
                completedAt: new Date().toISOString(),
                timestamp: Date.now()
            };

            // Update local state immediately
            dispatch({
                type: LEARNING_ACTIONS.COMPLETE_EXERCISE,
                payload: { exercise: exerciseRecord }
            });

            // Sync with server
            if (state.system.isOnline) {
                await apiService.submitExerciseProgress(
                    state.currentEnrollment.enrollmentId,
                    exerciseRecord
                );
                
                dispatch({
                    type: LEARNING_ACTIONS.SET_SYNC_STATUS,
                    payload: { 
                        status: SYNC_STATUS.SYNCED,
                        lastSync: new Date().toISOString()
                    }
                });
            } else {
                // Queue for offline sync
                dispatch({
                    type: LEARNING_ACTIONS.QUEUE_OFFLINE_ACTION,
                    payload: {
                        action: {
                            type: 'SYNC_EXERCISE',
                            data: exerciseRecord,
                            timestamp: new Date().toISOString()
                        }
                    }
                });
            }

            // Check for phase completion
            const currentPhaseProgress = state.progress[state.currentPhase];
            if (currentPhaseProgress.completed + 1 === currentPhaseProgress.total) {
                await handlePhaseCompletion(state.currentPhase);
            }

            return exerciseRecord;

        } catch (error) {
            dispatch({
                type: LEARNING_ACTIONS.SET_ERROR,
                payload: {
                    message: 'Failed to complete exercise',
                    code: 'EXERCISE_COMPLETION_ERROR',
                    context: { exerciseData }
                }
            });
            throw error;
        }
    }, [state, apiService]);

    /**
     * 🔄 Handle Phase Completion
     */
    const handlePhaseCompletion = useCallback(async (completedPhase) => {
        try {
            // Determine next phase
            const phaseOrder = [
                LEARNING_PHASES.MINDSET,
                LEARNING_PHASES.THEORY, 
                LEARNING_PHASES.HANDS_ON,
                LEARNING_PHASES.CERTIFICATION
            ];
            
            const currentIndex = phaseOrder.indexOf(completedPhase);
            if (currentIndex < phaseOrder.length - 1) {
                const nextPhase = phaseOrder[currentIndex + 1];
                
                // Unlock next phase
                dispatch({
                    type: LEARNING_ACTIONS.UNLOCK_PHASE,
                    payload: { phase: nextPhase }
                });

                // Update current phase
                dispatch({
                    type: LEARNING_ACTIONS.UPDATE_PHASE,
                    payload: { phase: nextPhase }
                });

                // Notify server
                if (state.system.isOnline) {
                    await apiService.updateLearningPhase(
                        state.currentEnrollment.enrollmentId,
                        nextPhase
                    );
                }

                // Special handling for mindset phase completion
                if (completedPhase === LEARNING_PHASES.MINDSET) {
                    await handleMindsetCompletion();
                }
            }

        } catch (error) {
            dispatch({
                type: LEARNING_ACTIONS.SET_ERROR,
                payload: {
                    message: 'Failed to handle phase completion',
                    code: 'PHASE_COMPLETION_ERROR',
                    context: { completedPhase }
                }
            });
        }
    }, [state, apiService]);

    /**
     * 💡 Handle Mindset Phase Completion
     */
    const handleMindsetCompletion = useCallback(async () => {
        try {
            // Submit final mindset assessment
            const assessmentScore = calculateMindsetAssessmentScore();
            
            dispatch({
                type: LEARNING_ACTIONS.SUBMIT_ASSESSMENT,
                payload: {
                    score: assessmentScore,
                    insights: generateMindsetInsights()
                }
            });

            // Sync with server
            if (state.system.isOnline) {
                await apiService.submitMindsetAssessment(
                    state.currentEnrollment.enrollmentId,
                    assessmentScore
                );
            }

        } catch (error) {
            console.error('Mindset completion error:', error);
        }
    }, [state, apiService]);

    /**
     * 📈 Calculate Mindset Assessment Score
     */
    const calculateMindsetAssessmentScore = useCallback(() => {
        // Calculate based on completed exercises and performance
        const totalExercises = Object.values(state.mindset.weeks)
            .reduce((sum, week) => sum + week.completed, 0);
        
        const maxExercises = Object.values(state.mindset.weeks)
            .reduce((sum, week) => sum + week.total, 0);
        
        return Math.round((totalExercises / maxExercises) * 100);
    }, [state.mindset]);

    /**
     * 🧠 Generate Mindset Insights
     */
    const generateMindsetInsights = useCallback(() => {
        const insights = [];
        const { weeks } = state.mindset;

        // Analyze each week's performance
        Object.entries(weeks).forEach(([week, data]) => {
            if (data.completed === data.total) {
                insights.push(`Excellent progress in ${data.topic}`);
            } else if (data.completed > 0) {
                insights.push(`Good start in ${data.topic}, consider completing all exercises`);
            }
        });

        return insights;
    }, [state.mindset]);

    /**
     * 🔄 Sync Offline Changes
     */
    const syncOfflineChanges = useCallback(async () => {
        if (state.sync.offlineQueue.length === 0) return;

        try {
            dispatch({
                type: LEARNING_ACTIONS.SET_SYNC_STATUS,
                payload: { status: SYNC_STATUS.SYNCING }
            });

            // Process each queued action
            for (const action of state.sync.offlineQueue) {
                switch (action.type) {
                    case 'SYNC_EXERCISE':
                        await apiService.submitExerciseProgress(
                            state.currentEnrollment.enrollmentId,
                            action.data
                        );
                        break;
                    case 'SYNC_PHASE_UPDATE':
                        await apiService.updateLearningPhase(
                            state.currentEnrollment.enrollmentId,
                            action.data.phase
                        );
                        break;
                    // Add other sync types as needed
                }
            }

            // Clear queue after successful sync
            dispatch({
                type: LEARNING_ACTIONS.PROCESS_OFFLINE_QUEUE
            });

            dispatch({
                type: LEARNING_ACTIONS.SET_SYNC_STATUS,
                payload: { 
                    status: SYNC_STATUS.SYNCED,
                    lastSync: new Date().toISOString()
                }
            });

        } catch (error) {
            dispatch({
                type: LEARNING_ACTIONS.SET_ERROR,
                payload: {
                    message: 'Failed to sync offline changes',
                    code: 'SYNC_ERROR',
                    context: { queueLength: state.sync.offlineQueue.length }
                }
            });
        }
    }, [state, apiService]);

    /**
     * 💾 Save State to Persistent Storage
     */
    const saveStateToStorage = useCallback(async () => {
        try {
            const stateToSave = {
                currentEnrollment: state.currentEnrollment,
                progress: state.progress,
                mindset: state.mindset,
                exercises: state.exercises,
                performance: state.performance,
                lastSaved: new Date().toISOString()
            };

            await AsyncStorage.setItem(
                STORAGE_KEYS.LEARNING_STATE,
                JSON.stringify(stateToSave)
            );
        } catch (error) {
            console.error('Failed to save learning state:', error);
        }
    }, [state]);

    /**
     * 🔄 Load State from Persistent Storage
     */
    const loadStateFromStorage = useCallback(async () => {
        try {
            const savedState = await AsyncStorage.getItem(STORAGE_KEYS.LEARNING_STATE);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                dispatch({
                    type: LEARNING_ACTIONS.HYDRATE_STATE,
                    payload: { state: parsedState }
                });
            }
        } catch (error) {
            console.error('Failed to load learning state:', error);
        }
    }, []);

    /**
     * 🌐 Network Status Monitoring
     */
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(networkState => {
            const isNowOnline = networkState.isConnected && networkState.isInternetReachable;
            const wasOnline = state.system.isOnline;

            dispatch({
                type: LEARNING_ACTIONS.SET_ONLINE_STATUS,
                payload: { isOnline: isNowOnline }
            });

            // If we just came online, sync offline changes
            if (isNowOnline && !wasOnline && state.sync.offlineQueue.length > 0) {
                syncOfflineChanges();
            }
        });

        return () => unsubscribe();
    }, [state.system.isOnline, state.sync.offlineQueue.length, syncOfflineChanges]);

    /**
     * 💾 Auto-save on State Changes
     */
    useEffect(() => {
        if (state.currentEnrollment) {
            saveStateToStorage();
        }
    }, [state.currentEnrollment, state.progress, state.mindset, saveStateToStorage]);

    /**
     * 🏗️ Initialize on Mount
     */
    useEffect(() => {
        loadStateFromStorage();
    }, [loadStateFromStorage]);

    // 🏗️ Context Value
    const contextValue = {
        // 🎯 State
        ...state,
        
        // 🎯 Actions
        initializeLearning,
        completeExercise,
        handlePhaseCompletion,
        syncOfflineChanges,
        
        // 💡 Mindset Actions
        updateMindsetWeek: (week) => dispatch({
            type: LEARNING_ACTIONS.UPDATE_MINDSET_WEEK,
            payload: { week }
        }),
        
        completeMindsetExercise: (week, exerciseId) => dispatch({
            type: LEARNING_ACTIONS.COMPLETE_MINDSET_EXERCISE,
            payload: { week, exerciseId }
        }),
        
        // 🎮 Exercise Actions
        startExercise: (exercise) => dispatch({
            type: LEARNING_ACTIONS.START_EXERCISE,
            payload: { exercise }
        }),
        
        // ⚙️ System Actions
        clearError: () => dispatch({ type: LEARNING_ACTIONS.CLEAR_ERROR }),
        setLoading: (isLoading) => dispatch({
            type: LEARNING_ACTIONS.SET_LOADING,
            payload: { isLoading }
        }),
        
        // 🔄 Utility Methods
        getCurrentProgress: () => state.progress[state.currentPhase],
        getOverallProgress: () => {
            const phases = Object.values(state.progress);
            const totalCompleted = phases.reduce((sum, phase) => sum + phase.completed, 0);
            const totalExercises = phases.reduce((sum, phase) => sum + phase.total, 0);
            return totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0;
        },
        
        isPhaseUnlocked: (phase) => {
            const phaseOrder = [
                LEARNING_PHASES.MINDSET,
                LEARNING_PHASES.THEORY,
                LEARNING_PHASES.HANDS_ON, 
                LEARNING_PHASES.CERTIFICATION
            ];
            
            const currentIndex = phaseOrder.indexOf(state.currentPhase);
            const targetIndex = phaseOrder.indexOf(phase);
            
            return targetIndex <= currentIndex;
        }
    };

    return (
        <LearningContext.Provider value={contextValue}>
            {children}
        </LearningContext.Provider>
    );
};

/**
 * 🏗️ Custom Hook for Learning Context
 */
export const useLearning = () => {
    const context = useContext(LearningContext);
    
    if (!context) {
        throw new Error('useLearning must be used within a LearningProvider');
    }
    
    return context;
};

/**
 * 🏗️ Hook for Phase-specific Progress
 */
export const usePhaseProgress = (phase) => {
    const { progress, isPhaseUnlocked } = useLearning();
    
    return {
        ...progress[phase],
        isUnlocked: isPhaseUnlocked(phase),
        isCompleted: progress[phase]?.status === PROGRESS_STATES.COMPLETED
    };
};

/**
 * 🏗️ Hook for Exercise Management
 */
export const useExerciseManager = () => {
    const { 
        startExercise, 
        completeExercise, 
        exercises,
        currentPhase 
    } = useLearning();

    return {
        startExercise,
        completeExercise,
        currentExercise: exercises.current,
        exerciseHistory: exercises.history,
        streak: exercises.streak,
        dailyProgress: {
            completed: exercises.completedToday,
            goal: exercises.dailyGoal,
            remaining: Math.max(0, exercises.dailyGoal - exercises.completedToday)
        },
        currentPhase
    };
};

// 🏗️ Enterprise Export Pattern
export default LearningContext;
export {
    LEARNING_PHASES,
    EXERCISE_TYPES, 
    PROGRESS_STATES,
    SYNC_STATUS,
    LEARNING_ACTIONS
};