import { useEffect } from 'react';
import CoursesList from '../CoursesList';
import { useSection } from '../../context/SectionContext';

const LongevityCourses = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    setCurrentSection('longevity-360');
  }, [setCurrentSection]);

  return <CoursesList sectionSlug="longevity-360" />;
};

export default LongevityCourses;

