/* Additional styles for Activity Cards and Components */

/* Activity Card Enhancements */
.activity-card {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    transition: all var(--transition);
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.activity-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    transform: scaleY(0);
    transition: transform var(--transition);
    transform-origin: top;
}

.activity-card:hover::before,
.activity-card.hovered::before {
    transform: scaleY(1);
}

.activity-card:hover,
.activity-card.hovered {
    border-color: var(--primary);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.activity-card.compact {
    padding: var(--space-4);
}

.activity-card.compact .activity-details {
    display: none;
}

/* Card Inner Structure */
.activity-