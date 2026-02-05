'use client';
import React, { useRef } from 'react';
import { useScroll, useTransform, useSpring, motion, MotionValue } from 'framer-motion';

export const ContainerScroll = ({
    titleComponent,
    children,
}: {
    titleComponent: string | React.ReactNode;
    children: React.ReactNode;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const scaleDimensions = () => {
        return isMobile ? [0.9, 1] : [0.88, 1];
    };

    // Smooth spring physics for inertia effect
    const smoothScrollY = useSpring(scrollY, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Cekat.ai exact values: 13deg tilt -> 0deg rigid
    const rotate = useTransform(smoothScrollY, [0, 300], [13, 0]);
    // Zoom IN effect: 0.88 -> 1
    const scale = useTransform(smoothScrollY, [0, 300], scaleDimensions());
    const translate = useTransform(smoothScrollY, [0, 300], [0, -50]);

    return (
        <div
            className="flex items-center justify-center relative p-2 md:p-20"
            ref={containerRef}
        >
            <div
                className="w-full relative"
                style={{
                    perspective: '1000px',
                }}
            >
                <Header translate={translate} titleComponent={titleComponent} />
                <Card rotate={rotate} translate={translate} scale={scale}>
                    {children}
                </Card>
            </div>
        </div>
    );
};

export const Header = ({ translate, titleComponent }: { translate: MotionValue<number>, titleComponent: any }) => {
    return (
        <motion.div
            style={{
                translateY: translate,
            }}
            className="div max-w-5xl mx-auto text-center"
        >
            {titleComponent}
        </motion.div>
    );
};

export const Card = ({
    rotate,
    scale,
    children,
}: {
    rotate: MotionValue<number>;
    scale: MotionValue<number>;
    translate: MotionValue<number>;
    children: React.ReactNode;
}) => {
    return (
        <motion.div
            style={{
                rotateX: rotate,
                scale,
            }}
            className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full p-1 md:p-1 bg-white/30 backdrop-blur-3xl rounded-[30px] relative"
        >
            {/* Blue Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none -z-10"></div>

            <div className="h-full w-full overflow-visible rounded-2xl bg-transparent md:rounded-2xl md:p-4">
                {children}
            </div>
        </motion.div>
    );
};
