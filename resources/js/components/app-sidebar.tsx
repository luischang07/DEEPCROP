import { IoLogOutOutline } from 'react-icons/io5';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, router } from '@inertiajs/react';
import { LayoutGrid } from 'lucide-react';
import AppLogo from './app-logo';   

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
];

export function AppSidebar() {
    const { state } = useSidebar();
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
                <button
                    onClick={() => router.post('/logout')}
                    className={`group flex w-full items-center rounded-md text-sm hover:bg-red-500 hover:text-white hover:font-semibold ${state === 'collapsed' ? 'p-1' : 'p-2'}`}
                >
                    <IoLogOutOutline className='fill-current text-white size-7' />
                    {state !== 'collapsed' && (
                        <div className="ml-1 grid flex-1 text-left text-sm">
                            <span className="truncate leading-none">Cerrar sesión</span>
                        </div>
                    )}
                </button>
            </SidebarFooter>
        </Sidebar>
    );
}
