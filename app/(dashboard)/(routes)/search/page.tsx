import { getCourses } from "@/actions/get-courses"
import { getCachedCategories } from "@/actions/get-categories-cache"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { Categories } from "./_components/categories"
import { SearchModalTrigger } from "@/components/search-modal-trigger"
import { CoursesList } from "@/components/courses-list"

interface SearchPageProps {
  searchParams: Promise<{
    title: string;
    categoryId: string;
  }>
}
// This page reads the session (auth) and redirects based on it, so it must
// always run at request time instead of being statically prerendered.
export const dynamic = "force-dynamic";

const SearchPage = async (props: SearchPageProps) => {
  const searchParams = await props.searchParams;

  const { userId } = await auth()

  if (!userId) {
    return redirect("/sign-in")
  }

  // Categories and courses are independent — fetch them concurrently, and use
  // the cached category list so the DB isn't hit on every search view.
  const [categories, courses] = await Promise.all([
    getCachedCategories().catch((error) => {
      console.log("[SEARCH_CATEGORIES]", error);
      return [];
    }),
    getCourses({ userId, ...searchParams }).catch((error) => {
      console.log("[SEARCH_COURSES]", error);
      return [];
    }),
  ]);

  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <SearchModalTrigger />
      </div>
      <div className="p-6 space-y-4">
        <Categories
          items={categories}
        />
        <CoursesList 
        items={courses}
        />
      </div>
    </>
  )
}

export default SearchPage