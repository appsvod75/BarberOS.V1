import React, { useRef, useState, useCallback } from 'react';

/**
 * Hook para habilitar el desplazamiento por arrastre (drag-to-scroll)
 * en contenedores con scroll. Ideal para tablets y PCs con mouse.
 */
export const useDragScroll = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startX, setStartX] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;

        // Solo permitir drag si no se está haciendo click en un input o botón
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button')) {
            return;
        }

        setIsDragging(true);
        setStartY(e.pageY - ref.current.offsetTop);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollTop(ref.current.scrollTop);
        setScrollLeft(ref.current.scrollLeft);

        // Cambiar cursor
        ref.current.style.setProperty('cursor', 'grabbing', 'important');
        ref.current.style.userSelect = 'none';
    }, []);

    const onMouseLeave = useCallback(() => {
        if (!ref.current) return;
        setIsDragging(false);
        ref.current.style.setProperty('cursor', 'grab', 'important');
        ref.current.style.removeProperty('user-select');
    }, []);

    const onMouseUp = useCallback(() => {
        if (!ref.current) return;
        setIsDragging(false);
        ref.current.style.setProperty('cursor', 'grab', 'important');
        ref.current.style.removeProperty('user-select');
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();

        const y = e.pageY - ref.current.offsetTop;
        const x = e.pageX - ref.current.offsetLeft;

        const walkY = (y - startY) * 1.5; // Ajustar sensibilidad
        const walkX = (x - startX) * 1.5;

        ref.current.scrollTop = scrollTop - walkY;
        ref.current.scrollLeft = scrollLeft - walkX;
    }, [isDragging, startY, startX, scrollTop, scrollLeft]);

    return {
        ref,
        props: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
            style: { cursor: 'grab' } as React.CSSProperties
        }
    };
};
